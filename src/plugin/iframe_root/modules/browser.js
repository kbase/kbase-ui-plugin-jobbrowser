define([
    'jquery',
    'kb_lib/html',
    './kbaseUI/widget/kbWidgetAdapter',
    // for effect
    './widgets/kbaseCatalogStats'
], function ($, html, KBWidgetAdapter) {
    'use strict';

    function factory(config) {
        var runtime = config.runtime,
            hostNode,
            container;

        // var jobsClient = new UJS(runtime.getConfig('services.user_job_state.url'), {
        //     token: runtime.service('session').getAuthToken()
        // });

        // API

        function attach(node) {
            hostNode = node;
            container = hostNode.appendChild(document.createElement('div'));
        }

        function start(params) {
            runtime.send('ui', 'setTitle', 'Job Browser');

            // add on a container div, then turn that into a kbaseCatalogStats widget, with a few extra options flagged.

            /* this is...let's charitably say stupid. Certainly obscure.
                kbaseCatalogStatus isn't exporting anything useful, and when I try to use it as a constructor it fails. I'm not clear
                why. Maybe the local kbwidget isn't current to the one in narrative?

                I also can't seem to get at $('#container').kbaseCatalogStats() (with or without capital 'B'). Says it's not a function.

                Fortunately, we still have our global KBase registry of all widgets, so we can peel it out of there. For lack of a better
                idea.
            */

            const wrapped = new KBWidgetAdapter({
                runtime,
                widget: {
                    title: 'Job Browser',
                    panel: false,
                    module: './widgets/kbaseCatalogStats',
                    jqueryObject: 'KBaseCatalogStats'
                }
            });

            return wrapped
                .init()
                .then(() => {
                    return wrapped.attach(container);
                })
                .then(() => {
                    return wrapped.start(params);
                });

            // window.KBase.kBaseCatalogStats(
            //     {
            //         runtime: runtime,
            //         usernames: [runtime.service('session').getUsername()],
            //         includePublicStats: false,
            //         includeUserRunSummary: false,
            //         useUserRecentRuns: true
            //     },
            //     $(container)
            // );

            // Convert this over to a wrapped widget.
        }

        function stop() {}

        function detach() {
            if (hostNode && container) {
                hostNode.removeChild(container);
            }
        }

        return {
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        };
    }
    return {
        make: factory
    };
});
