define([
    'bluebird',
    'jquery',
    'kb_common/utils',
    'kb_common/dom'
], function (
    Promise,
    $,
    Utils,
    dom
) {
    'use strict';

    function adapter(config) {
        var widget, mount, container, initConfig,
            runtime = config.adapterConfig.runtime,
            module = config.widgetDef.module;

        if (!runtime) {
            throw {
                type: 'ArgumentError',
                reason: 'RuntimeMissing',
                message: 'The runtime factory construction property is required but not provided'
            };
        }

        function init(cfg) {
            return new Promise(function (resolve) {
                require([module], function (Widget) {
                    if (!Widget) {
                        throw new Error('Widget module did not load properly (undefined) for ' + config.module);
                    }
                    // NB we save the config, because the internal widget 
                    // unfortunately requires the container in init, and 
                    // that is not available until attach...
                    initConfig = Utils.shallowMerge({}, config.initConfig);
                    Utils.merge(initConfig, cfg);
                    widget = Object.create(Widget);
                    resolve();
                });
            });
        }

        function attach(node) {
            return new Promise(function (resolve) {
                mount = node;
                container = dom.createElement('div');
                mount.appendChild(container);
                resolve();
            });
        }

        function start(params) {
            return new Promise(function (resolve) {
                // The config is supplied by the caller, but we add 
                // standard properties here.
                /* TODO: be more generic */
                // But then again, a widget constructed on this model does
                // not need a connector!
                // not the best .. perhaps merge the params into the config
                // better yet, rewrite the widgets in the new model...
                //var widgetConfig = config.widgetDef || params || {};
                //_.extend(widgetConfig, initConfig);

                var widgetConfig = Utils.shallowMerge(initConfig, {
                    container: $(container),
                    userId: runtime.getService('session').getUsername(),
                    runtime: runtime,
                    params: params
                });
                widget.init(widgetConfig);
                widget.go();

                resolve();
            });
        }

        function stop() {
            return Promise.try(function () {
                widget.stop();
            });
        }

        function detach() {
            return Promise.try(function () {
                mount.removeChild(container);
            });
        }

        function destroy() {
            // no method on the object widget to call.
        }

        return {
            init: init,
            attach: attach,
            start: start,
            stop: stop,
            detach: detach,
            destroy: destroy
        };
    }

    return {
        make: function (config) {
            return adapter(config);
        }
    };
});