/*eslint no-console: ["error", {allow: ["error", "warn", "log"]}]*/
define([
    'knockout'
], function (
    ko
) {
    'use strict';

    function isEmptyJSON(value) {
        if (value === undefined) {
            return true;
        }
        switch (value) {
        case '""':
            return true;
        case '[]':
            return true;
        case '{}':
            return true;
        case 'null':
            return true;
        }
    }

    ko.extenders.dirty = function (target, startDirty) {
        let lastValue = target();
        const cleanValue = ko.observable(ko.mapping.toJSON(target));

        const dirtyOverride = ko.observable(ko.utils.unwrapObservable(startDirty));

        target.isDirty = ko.computed(function () {
            const currentValue = ko.mapping.toJSON(target);
            const currentIsEmpty = isEmptyJSON(currentValue);
            const lastCleanValue = cleanValue();
            const cleanIsEmpty = isEmptyJSON(lastCleanValue);
            if (currentIsEmpty & cleanIsEmpty) {
                return false;
            }
            return dirtyOverride() || currentValue !== lastCleanValue;
        });

        target.markClean = function () {
            cleanValue(ko.mapping.toJSON(target));
            lastValue = target();
            dirtyOverride(false);
        };
        target.markDirty = function () {
            dirtyOverride(true);
        };
        target.reset = function () {
            target(lastValue);
        };

        return target;
    };

    ko.extenders.logChange = function (target, label) {
        target.subscribe(function (newValue) {
            console.log(label, newValue);
        });
        return target;
    };

    ko.extenders.enabled = function (target, config) {
        const isEnabled = ko.observable();
        target.isEnabled = isEnabled;

        function enableTest(newValue) {
            try {
                const enabled = isEnabled();
                const newEnabled = config.fun(newValue);
                if (enabled === undefined) {
                    // first time running.
                    isEnabled(newEnabled);
                } else {
                    if (enabled) {
                        if (!newEnabled) {
                            // reset target to be empty.
                            // target('');
                            isEnabled(false);
                        }
                    } else if (newEnabled) {
                        isEnabled(true);
                    }
                }
            } catch (ex) {
                console.error('Error running enable test: ' + ex.message);
            }
        }
        config.observable.subscribe(enableTest);
        // enableTest(config.observable());
    };

    ko.extenders.constraint = function (target, config) {
        target.constraint = {};
        target.constraint.description = config.description;
        target.constraint.messages = config.messages || {};

        if (config.required) {
            if (ko.isComputed(config.required)) {
                target.constraint.isRequired = config.required;
            } else if (ko.isObservable(config.required)) {
                target.constraint.isRequired = config.required;
            } else {
                target.constraint.isRequired = ko.observable(config.required);
            }
        } else {
            target.constraint.isRequired = ko.observable(false);
        }
        target.constraint.autoTrim = ko.observable(config.autoTrim || true);
        target.constraint.isValid = ko.observable(config.valid || true);
        target.constraint.message = ko.observable();
        target.constraint.state = ko.observable('new');

        function isEmpty(value) {
            if (typeof value === 'undefined' ||
                value === null) {
                return true;
            }
            if (typeof value === 'string') {
                if (target.constraint.autoTrim()) {
                    if (value.trim().length === 0) {
                        return true;
                    }
                }
            }
            if (value instanceof Array) {
                if (value.length === 0) {
                    return true;
                }
            }
            return false;
        }

        function validate() {
            try {
                const newValue = target();
                // first evaluate the required condition
                if (isEmpty(newValue)) {
                    if (target.constraint.isRequired()) {
                        target.constraint.message(target.constraint.messages.requiredButEmpty || 'Required but empty');
                        target.constraint.isValid(false);
                        target.constraint.state('required-missing');
                        return;
                    } else {
                        target.constraint.message('');
                        target.constraint.isValid(true);
                        target.constraint.state('empty-optional');
                        return;
                    }
                }

                // Then if it passes, run the validator
                if (!config.validate) {
                    target.constraint.message('');
                    target.constraint.isValid(true);
                    target.constraint.state('valid');
                    return;
                }
                let result = config.validate(newValue);
                if (typeof result === 'string') {
                    result = {
                        message: result
                    };
                }
                if (result) {
                    target.constraint.message(result.message || '');
                    target.constraint.isValid(false);
                    target.constraint.state('invalid');
                } else {
                    target.constraint.message('');
                    target.constraint.isValid(true);
                    target.constraint.state('valid');
                }
            } catch (ex) {
                target.constraint.message('Error running validation: ' + ex.message);
                console.error('Error running validation: ' + ex.message);
                target.constraint.isValid(false);
            }
        }

        validate(target());

        target.subscribe(validate);

        target.constraint.isRequired.subscribe(validate);

        return target;
    };

});
