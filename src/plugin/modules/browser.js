/*global define*/
/*jslint white:true,browser:true*/
define([
    'numeral',
    'kb/service/client/userAndJobState',
    'kb/common/html',
    'kb/common/format'
], function (numeral, UJS, html, format) {
    'use strict';
    function factory(config) {
        var runtime = config.runtime,
            parent, container,
            jobsClient = new UJS(runtime.getConfig('services.user_job_state.url'), {
                token: runtime.service('session').getAuthToken()
            });

        // IMPLEMENTATION


        function jobInfoToObject(jobInfo) {
            var properties = [
                'job', 'service', 'stage', 'started', 'status', 'last_update',
                'prog', 'max', 'ptype', 'est_complete', 'complete', 'error',
                'desc', 'job_info'
            ],
                jobInfoObject = {};

            properties.forEach(function (key, index) {
                jobInfoObject[key] = jobInfo[index];
            });
            return jobInfoObject;
        }

        function parseDate(date) {
            var parts = date.split(/[-T:+]/);
            if (parts.length !== 7) {
                throw new Error('Invalid date string');
            }
            var year = parseInt(parts[0], 10),
                month = parseInt(parts[1], 10),
                day = parseInt(parts[2], 10),
                hour = parseInt(parts[3], 10),
                minute = parseInt(parts[4], 10),
                seconds = parseInt(parts[5], 10),
                offset = parseInt(parts[6], 10);

            if (offset !== 0) {
                throw new Error('Date is not UTC');
            }

            return new Date(Date.UTC(year, month - 1, day, hour, seconds));
        }

        function niceDate(dateString) {
            var date;
            try {
                date = parseDate(dateString);
                return date.toLocaleString();
            } catch (ex) {
                return 'ER:' + ex.message;
            }
        }

        function renderTable(jobs) {
            var t = html.tag,
                table = t('table'), tr = t('tr'), th = t('th'), td = t('td');

            return table({class: 'table'}, [
                tr([
                    th('#'), th('Id'), th('Service'), th('Description'), th('Started'), th('Status'), th('Complete?'), th('Error?')
                ]),
                jobs
                    .sort(function (a, b) {
                        if (a.started > b.started) {
                            return -1;
                        }
                        return 1;
                    })
                    .map(function (jobInfo, index) {
                        // console.log(file);
                        //var created = new Date(file.created_on);                        
                        return tr([
                            td(String(index + 1)),
                            td(jobInfo.job),
                            td(jobInfo.service),
                            td(jobInfo.desc),
                            td(niceDate(jobInfo.started)),
                            td(jobInfo.status),
                            td(jobInfo.complete),
                            td(jobInfo.error)
                        ]);
                    })
            ]);
        }

        function render(jobs) {
            var t = html.tag, div = t('div');

            return div({class: 'container-fluid'}, [
                div({class: 'panel panel-default'}, [
                    div({class: 'panel-heading'}, [
                        div({class: 'panel-title'}, 'Jobs Browser')
                    ]),
                    div({class: 'panel-body'}, [
                        renderTable(jobs)
                    ])
                ])
            ]);
        }


        // API

        function attach(node) {
            parent = node;
            container = parent.appendChild(document.createElement('div'));
        }

        function start(params) {
            // get a list of shock nodes.
            return jobsClient.list_jobs().
                then(function (jobs) {
                    //console.log(jobs);
                    //container.innerHTML = 'Hi';
                    container.innerHTML = render(jobs.map(function (job) {
                        return jobInfoToObject(job);
                    }));
//                    return nodes.map(function (node) {
//                        return shockClient.get_node_acls(node.id);
//                    });

                });
        }

        function stop() {
        }

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