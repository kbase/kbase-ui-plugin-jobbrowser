/*global
 define, console
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'bluebird',
    'kb_common/utils',
    './utils',
    './client/workspace'
],
    function (Promise, Utils, APIUtils, Workspace) {
        'use strict';
        return Object.create({}, {
            init: {
                value: function (cfg) {
                    if (!cfg.url) {
                        throw 'The workspace client url is not defined';
                    }
                    this.workspaceClient = new Workspace(cfg.url, {
                        token: cfg.authToken
                    });
                    
//                    if (R.hasConfig('services.workspace.url')) {
//                        // console.log(Workspace);
//                        this.workspaceClient = new Workspace(R.getConfig('services.workspace.url'), {
//                            token: R.getAuthToken()
//                        });
//                    } else {
//                        throw 'The workspace client url is not defined';
//                    }
                    return this;
                }
            },
            isValidNarrative: {
                value: function (ws) {
                    // corrupt workspaces may have narrative set to something other than the object id of the narrative
                    if (ws.metadata.narrative && /^\d+$/.test(ws.metadata.narrative) && ws.metadata.is_temporary !== 'true') {
                        return true;
                    }
                    return false;
                }
            },
            applyNarrativeFilter: {
                value: function (ws, filter) {
                    return true;
                }
            },
            getNarratives: {
                value: function (cfg) {
                    // get all the narratives the user can see.
                    return new Promise(function (resolve, reject) {
                        Promise.resolve(this.workspaceClient.list_workspace_info(cfg.params))
                            .then(function (data) {
                                var workspaces = [], i, wsInfo;
                                for (i = 0; i < data.length; i += 1) {
                                    wsInfo = APIUtils.workspace_metadata_to_object(data[i]);
                                    if (this.isValidNarrative(wsInfo) && this.applyNarrativeFilter(cfg.filter)) {
                                        workspaces.push(wsInfo);
                                    }
                                }

                                var objectRefs = workspaces.map(function (w) {
                                    return {
                                        ref: w.id + '/' + w.metadata.narrative
                                    };
                                });

                                // Now get the corresponding object metadata for each narrative workspace
                                Promise.resolve(this.workspaceClient.get_object_info_new({
                                    objects: objectRefs,
                                    ignoreErrors: 1,
                                    includeMetadata: 1
                                }))
                                    .then(function (data) {
                                        var narratives = [], i;
                                        for (i = 0; i < data.length; i += 1) {
                                            // If one of the object ids from the workspace metadata (.narrative) did not actually
                                            // result in a hit, skip it. This can occur if a narrative is corrupt -- the narrative object
                                            // was deleted or replaced and the workspace metadata not updated.
                                            if (!data[i]) {
                                                console.log('WARNING: workspace ' + narratives[i].workspace.id + ' does not contain a matching narrative object');
                                                continue;
                                            }
                                            // Make sure it is a valid narrative object.
                                            var object = APIUtils.object_info_to_object(data[i]);
                                            if (object.typeName !== 'Narrative') {
                                                console.log('WARNING: workspace ' + object.wsid + ' object ' + object.id + ' is not a valid Narrative object');
                                                continue;
                                            }
                                            narratives.push({
                                                workspace: workspaces[i],
                                                object: object
                                            });
                                        }
                                        resolve(narratives);
                                    }.bind(this))
                                    .catch(function (err) {
                                        reject(err);
                                    });
                            }.bind(this))
                            .catch(function (err) {
                                reject(err);
                            });
                    }.bind(this));
                }
            },
            getPermissions: {
                value: function (narratives) {
                    return new Promise(function (resolve, reject, notify) {
                        var promises = narratives.map(function (narrative) {
                            return Promise.resolve(this.workspaceClient.get_permissions({
                                id: narrative.workspace.id
                            }));
                        }.bind(this));
                        var username = R.getUsername();
                        Promise.all(promises)
                            .then(function (permissions) {
                                var i, narrative;
                                for (i = 0; i < permissions.length; i += 1) {
                                    narrative = narratives[i];
                                    narrative.permissions = Utils.object_to_array(permissions[i], 'username', 'permission')
                                        .filter(function (x) {
                                            if (x.username === username ||
                                                x.username === '*' ||
                                                x.username === narrative.workspace.owner) {
                                                return false;
                                            }
                                            return true;
                                        })
                                        .sort(function (a, b) {
                                            if (a.username < b.username) {
                                                return -1;
                                            }
                                            if (a.username > b.username) {
                                                return 1;
                                            }
                                            return 0;
                                        });
                                }
                                resolve(narratives);
                            }.bind(this))
                            .catch(function (err) {
                                reject(err);
                            });
                    }.bind(this));
                }
            },
            getObject: {
                value: function (workspaceId, objectId) {
                    return new Promise(function (resolve, reject) {
                        var objectRefs = [{ref: workspaceId + '/' + objectId}];
                        Promise.resolve(this.workspaceClient.get_object_info_new({
                            objects: objectRefs,
                            ignoreErrors: 1,
                            includeMetadata: 1
                        }))
                            .then(function (data) {
                                if (data.length === 0) {
                                    reject('Object not found');
                                    return;
                                }
                                if (data.length > 1) {
                                    reject('Too many (' + data.length + ') objects found.');
                                    return;
                                }
                                if (data[0] === null) {
                                    reject('Null object returned');
                                    console.log(data);
                                    return;
                                }

                                var object = APIUtils.object_info_to_object(data[0]);
                                resolve(object);
                            }.bind(this))
                            .catch(function (err) {
                                reject(err);
                            });
                    }.bind(this));
                }
            },
            // this takes a list of refs and creates <workspace_name>/<object_name>
            // if links is true, hrefs are returned as well
            // from kbapi.js, along with possible bugs.
            translateRefs: {
                value: function (reflist, links) {
                    return new Promise(function (resolve, reject) {
                        var obj_refs = reflist.map(function (ref) {
                           return {ref: ref};
                        });
                        Promise.resolve(this.workspaceClient.get_object_info_new({
                            objects: obj_refs,
                            ignoreErrors: 1,
                            includeMetadata: 1
                        })).
                            then(function (data) {
                                var refhash = {},
                                    i;
                                for (i = 0; i < data.length; i += 1) {
                                    var item = data[i],
                                        full_type = item[2],
                                        module = full_type.split('.')[0],
                                        type = full_type.slice(full_type.indexOf('.') + 1),
                                        kind = type.split('-')[0],
                                        label = item[7] + "/" + item[1],
                                        route, sub;
                                    switch (kind) {
                                        case 'FBA':
                                            sub = 'fbas/';
                                            break;
                                        case 'FBAModel':
                                            sub = 'models/';
                                            break;
                                        case 'Media':
                                            route = 'media/';
                                            break;
                                        case 'Genome':
                                            route = 'genomes/';
                                            break;
                                        case 'MetabolicMap':
                                            route = 'maps/';
                                            break;
                                        case 'PhenotypeSet':
                                            route = 'phenotype/';
                                            break;
                                    }

                                    var link = '<a href="#/' + route + label + '">' + label + '</a>';
                                    refhash[reflist[i]] = {link: link, label: label};
                                }

                                resolve(refhash);
                            })
                            .catch(function (err) {
                                console.log('ERROR');
                                console.log(err);
                                reject(err);
                            });
                    }.bind(this));
                }
            }
        });
    });