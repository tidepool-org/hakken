/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 * 
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

var util = require('util');

var _ = require('lodash');
var async = require('async');

var except = require('amoeba').except;
var pre = require('amoeba').pre;

var configToWatchHelpers = require('./configToWatchHelpers.js');
var updaters = require('./updaters.js');

module.exports = function hakken(config, log, coordinatorClientFactory, polling)
{
  if (log == null) {
    log = require('../log.js')('client.js');
  }

  config = _.cloneDeep(config);
  pre.hasProperty(config, 'host');
  pre.hasProperty(config, 'heartbeatInterval');
  pre.hasProperty(config, 'pollInterval');
  pre.hasProperty(config, 'resyncInterval');
  pre.hasProperty(config, 'skipHakken');


  var coordinatorClient = coordinatorClientFactory(config);

  var coordinators = {};
  var coordQueue = [];
  var listings = [];
  var started = false;

  function removeCoordinator(host)
  {
    log.info("Removing coordinator[%s]", host);
    delete coordinators[host];
    var complete = false;
    var index = 0;
    while (!complete) {
      for (index = 0; index < coordQueue.length; ++index) {
        if (host === coordQueue[index].getHost()) {
          coordQueue.splice(index, 1);
          break; // splice mutates the list, so break and re-enter
        }
      }
      complete = true;
    }
  }

  function handleCoordinator(coordinator)
  {
    var foundHost = coordinator.host;
    if (coordinators[foundHost] == null) {
      log.info('Adding coordinator[%j]', coordinator);
      var client = coordinatorClientFactory(coordinator);
      coordinators[foundHost] = {
        payload: coordinator,
        client: client
      };
      coordQueue.push(client);
      polling.repeat(
        util.format('coordinator-poller-%s', foundHost),
        function(cb) {
          if (coordinators[foundHost] == null) {
            cb({ message: util.format('unknown host[%s]', foundHost)});
            return;
          }

          coordinators[foundHost].client.getCoordinators(function (err, coords) {
            if (err != null) {
              log.info('Error talking to a coordinator[%s].  Dropping.', foundHost);
              removeCoordinator(foundHost);
              cb('stop');
            }
            else {
              coords.forEach(handleCoordinator);
              cb();
            }
          });
        },
        config.pollInterval
      );
    }
  }

  function resyncCoordinators(cb)
  {
    coordinatorClient.getCoordinators(function (err, coords) {
      if (err != null) {
        err.message = util.format('host[%s]: %s', coordinatorClient.getHost(), err.message);
      }
      else {
        coords.forEach(handleCoordinator);
      }
      cb(err);
    });
  }

  function publishListing(listing, cb)
  {
    async.map(
      coordQueue,
      function (client, cb)
      {
        client.listingHeartbeat(listing, function (err)
        {
          if (err != null) {
            log.error(err, 'Problem publishing listing[%j] to host[%s]', listing, client.getHost());
          }
          cb();
        });
      },
      function (err, results)
      {
        if (err != null) {
          log.error(err, "wtf!? how did an error get thrown here, none of the functions should ever throw an error");
        }
        if (cb != null) {
          cb(err);
        }
      }
    );
  }

  function handleError(type, cb)
  {
    var msg = Array.prototype.slice.call(arguments, 2);
    if (cb == null) {
      if (type === 'throw') {
        throw except.IAE.apply(null, msg);
      }
      else {
        log.error.apply(log, msg);
      }
    }
    else {
      cb(util.format.apply(util, msg));
    }
  }

  function startPolling()
  {
    started = true;
    polling.repeat(
      'coordinator-resync',
      function(cb){
        if (!started) {
          cb('not started!');
          return;
        }

        resyncCoordinators(function(err) {
          if (err) {
            log.info(err, 'Unable to resyncCoordinators');
          }
          cb();
        });
      },
      config.resyncInterval
    );
    polling.repeat(
      'service-publishing',
      function (cb)
      {
        if (! started) {
          cb('not started!');
          return;
        }

        for (var i = 0; i < listings.length; ++i) {
          publishListing(listings[i]);
        }
        cb();
      },
      config.heartbeatInterval
    );
  }

  return {
    /*
     Starts hakken, how novel.

     cb - optional.  If provided, hakken will only schedule its polling jobs if
     it can successfully find some coordinators.  Otherwise, it will report an
     error on the cb.  If not provided, hakken will "start" and just keep trying
     to connect to coordinators even if it cannot find any initially.
     */
    start: function (cb)
    {
      if (config.skipHakken) return;
      if (!started) {
        if (cb == null) { // No callback, start unconditionally
          startPolling();
        }
        else {
          resyncCoordinators(function (err) {
            if (err == null) {
              startPolling();
            }
            cb(err);
          });
        }
      }
    },

    /*
     Stops hakken.

     Starting again might or might not work.  Just create a new object.
     */
    close: function ()
    {
      if (config.skipHakken) return;

      if (started) {
        log.info('Stopping hakken');
        started = false;
        for (var host in coordinators) {
          removeCoordinator(host);
        }
        listings = [];
      }
    },

    /*
      Returns the list of current coordinators.  Primarily exposed for testing, depend on it at your own risk.

      If this disappears in future releases, sorry.
     */
    getCoordinators: function()
    {
      return Object.keys(coordinators);
    },

    /*
      Returns the current list of listings.
     */
    getListings: function()
    {
      return listings;
    },

    /*
     Publishes a service described by the listing.

     listing - an partially opaque object representing a "service".  Must have properties:
     -- service - name of service being published
     -- host - FQDN used to contact the service
     cb - optional, if provided, will be called when publishing is complete
     */
    publish: function (listing, cb)
    {
      pre.hasProperty(listing, 'service');
      pre.hasProperty(listing, 'host');
      listings.push(listing);

      if (config.skipHakken) return;

      if (started) {
        publishListing(listing, cb);
      }
      else {
        handleError('throw', cb, 'Hakken not started.  Call start() first.');
      }
    },

    /**
     * Starts a "watch" on a given service.  Returns an object that encapsulates the selection
     * of an available instance.  It provides a get() method, which should be able to be used
     * to select an instance, and a stop() method, which stops it from updating.
     *
     * @param service the name of the service to watch
     * @param filter optional, returned listings will match the key-value pairs set in this object
     * @param updater optional, an object with two methods:
     *   update(listings) -- passed in the current set of active listings
     *   get() -- used to select a listing
     * @returns {{get: get, start: start, close: close}}
     */
    watch: function (service, filter, updater)
    {
      if (updater == null) {
        updater = updaters.list(log);
      }
      if (filter != null) {
        updater = updaters.wrappers.filter(updater, filter);
      }

      var watchStarted = false;

      return {
        get: function () {
          if (!watchStarted) {
            throw except.ISE("Watch not started, please start a watch before using it.");
          }
          return updater.get();
        },

        start: function(callback) {
          if (!watchStarted) {
            if (!started) {
              throw except.ISE("Hakken not started, please start hakken before starting a watch.");
            }
            log.info('Starting watch for service[%s]', service);
            watchStarted = true;
            var pollFunction = function (cb) {
              if (!started) {
                cb('hakken stopped!');
                return;
              }

              if (!watchStarted) {
                cb('watch stopped!');
                return;
              }

              if (coordQueue.length < 1) {
                log.warn('No known coordinators, not updating listings for service[%s]', service);
                cb();
                return;
              }

              var client = coordQueue[0];
              client.getListings(service, function (err, newListings) {
                if (err != null) {
                  log.warn(err, 'Error updating listings for service[%s] from host[%s]', service, client.getHost());
                }
                else {
                  updater.update(newListings);
                }
                cb();
              });
            };

            var startPoll = function(){
              polling.repeat(util.format('service-watch-%s', service), pollFunction, config.heartbeatInterval);
            };

            if (callback != null) {
              if (coordQueue.length < 1) {
                callback('No known coordinators, call hakken.start() with a callback before calling start() on a watch with a callback');
                return;
              }
              pollFunction(function(err){
                if (err != null) {
                  callback(err);
                }
                setTimeout(startPoll, config.heartbeatInterval).unref();
                callback();
              });
            }
            else {
              startPoll();
            }
          }
        },

        close: function(cb) {
          if (watchStarted) {
            watchStarted = false;
          }
          if (cb != null) {
            cb();
          }
        }
      };
    },

    /**
     * Helper method to simplify creating a random watch.  Delegates to watch and shouldn't do anything
     * that users couldn't do on their own.
     *
     * @param service see watch()
     * @param filter see watch()
     * @param config can be provided numToPull or log, which are just passed through to the underlying updater fns
     * @returns a random watch
     */
    randomWatch: function(service, filter, config) {
      if (config == null) {
        config = {};
      }
      return this.watch(service, filter, updaters.wrappers.random(updaters.list(config.log || log), config.numToPull));
    },

    /**
     * Helper method to create a "static" watch.  This watch doesn't actually watch anything and just returns
     * values from the list it is given.
     *
     * @param hosts a list of objects to return for this watch
     * @returns a static watch
     */
    staticWatch: function(hosts) {
      if (hosts == null) {
        hosts = [];
      }
      var started = false;
      return {
        get: function() {
          if (! started) {
            throw except.ISE("Hakken not started, please start hakken before using a watch.");
          }

          return _.clone(hosts);
        },
        start: function(cb) {
          started = true;
          if (cb != null) {
            cb();
          }
        },
        close: function(cb) {
          started = false;
          if (cb != null) {
            cb();
          }
        }
      }
    },

    /**
     * A method to convert configuration into a watcher.  This method is included as an example of a way to
     * configure hakken watches.  It can be used as a pass-thru from configuration directly into a watcher object
     * to simplify the creation of configuration that is helpful when transitioning from local development to
     * production delpoyments.
     *
     * This method just delegates to the methods available in configToWatchHelpers.js
     *
     * @param config A config object.  Must have a `type` parameter.  Other required parameters might also be required
     *               based on the `type`.
     * @returns {*} a watcher that was built based on the config provided
     */
    watchFromConfig: function(config) {
      if (typeof config === 'string') {
        config = { type: 'random', service: config };
      }

      var type = pre.hasProperty(config, 'type');

      if (configToWatchHelpers[type] == null) {
        return null;
      }

      return configToWatchHelpers[type](this, config);
    },

    updaters: updaters
  };
};