define([
    'text',
    'js-yaml'
], function(
    text,
    yaml
) {
    'use strict';
    var buildMap = {};

    return {
        write: function(pluginName, name, write) {
            if (name in buildMap) {
                write('define("' +
                    pluginName +
                    '!' +
                    name +
                    '", function(){ return ' +
                    buildMap[name] +
                    '; });\n');
            }
        },
        load: function(name, parentRequire, onload, config) {
            text.get(parentRequire.toUrl(name), function(yamlString) {
                try {
                    var result = yaml.safeLoad(yamlString);
                    if (config.isBuild) {
                        buildMap[name] = JSON.stringify(result);
                    }
                    onload(result);
                } catch (e) {
                    onload.error(e);
                }
            });

        },
        version: '1.0.3'
    };
});