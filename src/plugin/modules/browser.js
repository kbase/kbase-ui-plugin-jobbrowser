define([
    'uuid',
    'jquery',
    'kb_service/client/userAndJobState',
    'kb_common/html',
    'plugins/catalog/modules/widgets/kbaseCatalogStats',
], function (
    Uuid,
    $,
    UJS,
    html,
    KBaseCatalogStats
) {
    'use strict';

    function factory(config) {
        var runtime = config.runtime,
            parent, container, containerId;
        var jobsClient = new UJS(runtime.getConfig('services.user_job_state.url'), {
            token: runtime.service('session').getAuthToken()
        });

        // API

        function attach(node) {
            parent = node;
            container = parent.appendChild(document.createElement('div'));
            containerId = new Uuid(4).format();
            container.id = containerId;
        }

        function start(params) {
            runtime.send('ui', 'setTitle', 'Jobs Browser');

            // add on a container div, then turn that into a kbaseCatalogStats widget, with a few extra options flagged.

            /* this is...let's charitably say stupid. Certainly obscure.
                kbaseCatalogStatus isn't exporting anything useful, and when I try to use it as a constructor it fails. I'm not clear
                why. Maybe the local kbwidget isn't current to the one in narrative?
    
                I also can't seem to get at $('#container').kbaseCatalogStats() (with or without capital 'B'). Says it's not a function.
    
                Fortunately, we still have our global KBase registry of all widgets, so we can peel it out of there. For lack of a better
                idea.
            */
            window.KBase.kBaseCatalogStats(
                {
                    runtime: runtime,
                    usernames: [runtime.service('session').getUsername()],
                    includePublicStats: false,
                    includeUserRunSummary: false,
                    useUserRecentRuns: true,
                },
                $('#' + containerId)
            );
        }

        function stop() { }

        function detach() {
            if (container) {
                parent.removeChild(container);
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
        make: function (config) {
            return factory(config);
        }
    };
});
