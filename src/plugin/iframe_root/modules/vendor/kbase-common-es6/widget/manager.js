define([
    'bluebird',
    './adapters/objectWidget',
    './adapters/kbWidget',
    '../merge'
], function (
    Promise,
    objectWidgetAdapter,
    kbwidgetAdapter,
    merge
) {
    'use strict';

    class WidgetManager {
        constructor(config) {
            // TODO: get rid of this?
            // if (!config.runtime) {
            //     throw new Error('WidgetManager requires a runtime argument; pass as "runtime"')
            // }
            // this.runtime = config.runtime;
            if (!config.baseWidgetConfig) {
                throw new Error('WidgetManager requires a baseWidgetConfig argument; pass as "baseWidgetConfig"');
            }
            this.baseWidgetConfig = config.baseWidgetConfig;

            this.widgets = {};
        }

        addWidget(widgetDef) {
            if (widgetDef.id) {
                widgetDef.name = widgetDef.id;
            }
            if (this.widgets[widgetDef.name]) {
                throw new Error('Widget ' + widgetDef.name + ' is already registered');
            }
            /* TODO:  validate the widget ...*/
            this.widgets[widgetDef.name] = widgetDef;
        }

        getWidget(widgetId) {
            return this.widgets[widgetId];
        }

        makeFactoryWidget(widget, config) {
            return new Promise((resolve, reject) => {
                var required = [widget.module];
                if (widget.css) {
                    required.push('css!' + widget.module + '.css');
                }
                require(required,
                    (factory) => {
                        if (typeof factory === 'undefined') {
                            // TODO: convert to real Error object
                            reject({
                                message: 'Factory widget maker is undefined for ' + widget.module,
                                data: { widget: widget }
                            });
                            return;
                        }
                        if (factory.make === undefined) {
                            reject('Factory widget does not have a "make" method: ' + widget.name + ', ' + widget.module);
                            return;
                        }
                        try {
                            resolve(factory.make(config));
                        } catch (ex) {
                            reject(ex);
                        }
                    },
                    (error) => {
                        reject(error);
                    });
            });
        }

        makeES6Widget(widget, config) {
            return new Promise((resolve, reject) => {
                var required = [widget.module];
                if (widget.css) {
                    required.push('css!' + widget.module + '.css');
                }
                require(required,
                    (module) => {
                        let Widget;
                        if (module.Widget) {
                            Widget = module.Widget;
                        } else {
                            Widget = module;
                        }
                        if (typeof Widget === 'undefined') {
                            reject({
                                message: 'Widget class is undefined for ' + widget.module,
                                data: { widget: widget }
                            });
                            return;
                        }
                        try {
                            resolve(new Widget(config));
                        } catch (ex) {
                            reject(ex);
                        }
                    },
                    (error) => {
                        reject(error);
                    });
            });
        }

        makeKbWidget(widget, config) {
            return Promise.try(() => {
                const configCopy = new merge.ShallowMerger({}).mergeIn(config).value();
                configCopy.widget = {
                    module: widget.module,
                    jquery_object: (widget.config && widget.config.jqueryName) || config.jqueryName,
                    panel: config.panel,
                    title: widget.title
                };

                return new kbwidgetAdapter.KBWidgetAdapter(configCopy);
            });
        }

        makeObjectWidget(widget, config) {
            return Promise.try(() => {
                const configCopy = new merge.ShallowMerger({}).mergeIn(config).value();
                configCopy.widgetDef = widget;
                configCopy.initConfig = config;
                const x = new objectWidgetAdapter.ObjectWidgetAdapter(configCopy);
                return x;
            });
        }

        validateWidget(widget, name) {
            var message;
            if (typeof widget !== 'object') {
                message = 'Invalid widget after making: ' + name;
            }

            if (message) {
                console.error(message);
                console.error(widget);
                throw new Error(message);
            }
        }

        makeWidget(widgetName, config) {
            const widgetDef = this.widgets[widgetName];
            if (!widgetDef) {
                throw new Error('Widget ' + widgetName + ' not found');
            }

            let widgetPromise;

            const configCopy = new merge.DeepMerger({}).mergeIn(config).value();
            const widgetConfig = new merge.DeepMerger(configCopy).mergeIn(this.baseWidgetConfig).value();

            config = config || {};
            // config.runtime = this.runtime;
            // TODO: this is not wonderful...
            // config =

            // How we create a widget depends on what type it is.
            switch (widgetDef.type) {
            case 'factory':
                widgetPromise = this.makeFactoryWidget(widgetDef, widgetConfig);
                break;
            case 'es6':
                widgetPromise = this.makeES6Widget(widgetDef, widgetConfig);
                break;
            case 'object':
                widgetPromise = this.makeObjectWidget(widgetDef, widgetConfig);
                break;
            case 'kbwidget':
                widgetPromise = this.makeKbWidget(widgetDef, widgetConfig);
                break;
            default:
                throw new Error('Unsupported widget type ' + widgetDef.type);
            }
            return widgetPromise
                .then((widget) => {
                    this.validateWidget(widget, widgetName);
                    return widget;
                });
        }
    }

    return {WidgetManager};
});