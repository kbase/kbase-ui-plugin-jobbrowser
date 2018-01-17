/*global define*/
/*jslint white:true,browser:true*/
define([
    'kb_service/client/userAndJobState',
    'kb_common/html',
    'plugins/catalog/modules/widgets/kbaseCatalogStats',
], function(UJS, html, kbaseCatalogStats) {
    'use strict';

    function factory(config) {
        var runtime = config.runtime,
            parent, container,
            jobsClient = new UJS(runtime.getConfig('services.user_job_state.url'), {
                token: runtime.service('session').getAuthToken()
            });

        // IMPLEMENTATION

        function render() {

          var t = html.tag,
              div = t('div');

          var container = div({id : 'container'});
          return container;

        }


        // API

        function attach(node) {
            parent = node;
            container = parent.appendChild(document.createElement('div'));
        }

        function start(params) {
          container.innerHTML = render();

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
              runtime                 : runtime,
              usernames               : [runtime.service('session').getUsername()],
              includePublicStats      : false,
              includeUserRunSummary   : false,
              useUserRecentRuns       : true,
            },
            $('#container')
          );

        }

        function stop() {}

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
        make: function(config) {
            return factory(config);
        }
    };
});
