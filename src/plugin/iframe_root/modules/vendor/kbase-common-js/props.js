define([
    'underscore'
], function(_) {
    'use strict';

    function item(config) {

        var obj = config ? config.data || {} : {};

        function getItem(props, defaultValue) {
            if (typeof props === 'string') {
                props = props.split('.');
            } else if (!_.isArray(props)) {
                throw new TypeError('Invalid type for key: ' + (typeof props));
            }
            var i, temp = obj;
            for (i = 0; i < props.length; i += 1) {
                if ((temp === undefined) ||
                    (typeof temp !== 'object') ||
                    (temp === null)) {
                    return defaultValue;
                }
                temp = temp[props[i]];
            }
            if (temp === undefined) {
                return defaultValue;
            }
            return temp;
        }

        function hasItem(propPath) {
            if (typeof propPath === 'string') {
                propPath = propPath.split('.');
            }
            var i, temp = obj;
            for (i = 0; i < propPath.length; i += 1) {
                if ((temp === undefined) ||
                    (typeof temp !== 'object') ||
                    (temp === null)) {
                    return false;
                }
                temp = temp[propPath[i]];
            }
            if (temp === undefined) {
                return false;
            }
            return true;
        }

        function setItem(path, value) {
            if (typeof path === 'string') {
                path = path.split('.');
            }
            if (path.length === 0) {
                return;
            }
            // pop off the last property for setting at the end.
            var propKey = path.pop(),
                key, temp = obj;
            // Walk the path, creating empty objects if need be.
            while (path.length > 0) {
                key = path.shift();
                if (temp[key] === undefined) {
                    temp[key] = {};
                }
                temp = temp[key];
            }
            // Finally set the property.
            temp[propKey] = value;
            return value;
        }

        function incrItem(path, increment) {
            if (typeof path === 'string') {
                path = path.split('.');
            }
            if (path.length === 0) {
                return;
            }
            increment = (increment === undefined) ? 1 : increment;
            var propKey = path.pop(),
                key, temp = obj;
            while (path.length > 0) {
                key = path.shift();
                if (temp[key] === undefined) {
                    temp[key] = {};
                }
                temp = temp[key];
            }
            if (temp[propKey] === undefined) {
                temp[propKey] = increment;
            } else {
                if (_.isNumber(temp[propKey])) {
                    temp[propKey] += increment;
                } else {
                    throw new Error('Can only increment a number');
                }
            }
            return temp[propKey];
        }

        function deleteItem(path) {
            if (typeof path === 'string') {
                path = path.split('.');
            }
            if (path.length === 0) {
                return;
            }
            var propKey = path.pop(),
                key, temp = obj;
            while (path.length > 0) {
                key = path.shift();
                if (temp[key] === undefined) {
                    return false;
                }
                temp = temp[key];
            }
            delete temp[propKey];
            return true;
        }

        return {
            setItem: setItem,
            hasItem: hasItem,
            getItem: getItem,
            incrItem: incrItem,
            deleteItem: deleteItem,
            debug: function() {
                return obj;
            }
        };
    }

    return {
        create: function() {
            return item();
        },
        make: function(config) {
            return item(config);
        }
    };
});