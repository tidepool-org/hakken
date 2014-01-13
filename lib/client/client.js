/*
 * Copyright (c) 2014, Tidepool Project
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this
 * list of conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

var util = require('util');

var _ = require('lodash');
var async = require('async');

var except = require('../common/except.js');
var pre = require('../common/pre.js');

var watchers = require('./watchers.js');

module.exports = function hakken(config, log, coordinatorClientFactory, polling)
{
  if (log == null) {
    log = require('../log.js')('client.js');
  }

  config = _.cloneDeep(config);
  pre.hasProperty(config, 'host');
  pre.defaultProperty(config, 'heartbeatInterval', 20000);
  pre.defaultProperty(config, 'pollInterval', 60000);
  pre.defaultProperty(config, 'resyncInterval', config.pollInterval * 10);

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

      if (started) {
        listings.push(listing);
        publishListing(listing, cb);
      }
      else {
        handleError('throw', cb, 'Hakken not started.  Call start() first.');
      }
    },

    /*
     Starts a "watch" on a given service.  Returns an object that encapsulates the selection
     of an available instance.  It provides a get() method, which should be able to be used
     to select an instance, and a stop() method, which stops it from updating.

     service - the name of the service to watch
     filter - optional, an object whose key-value pairs represent key-values pairs that should exist on returned listings.

     returns an object with a get() method that will return the list of listings that match the service and filter
     */
    watch: function (service, filter)
    {
      var filterFn = null;
      if (filter != null) {
        propertyFilters = Object.keys(filter).map(function(key){
          var val = filter[key];
          if (typeof val === 'function') {
            return val;
          }
          return function(listing) {
            return listing[key] === val;
          }
        });

        filterFn = function(listing) {
          for (var i = 0; i < propertyFilters.length; ++i) {
            if (! propertyFilters[i](listing)) {
              return false;
            }
          }
          return true;
        }
      }

      var serviceListings = [];
      var shouldWatch = true;

      polling.repeat(
        util.format('service-watch-%s', service),
        function (cb) {
          if (!started) {
            cb('hakken stopped!');
            return;
          }

          if (!shouldWatch) {
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
              var oldListings = serviceListings;
              if (filterFn == null) {
                serviceListings = newListings;
              }
              else {
                serviceListings = newListings.filter(filterFn);
              }

              var i = 0;
              for (i = 0; i < oldListings.length; ++i) {
                if (! serviceListings.some(_.isEqual.bind(_, oldListings[i]))) {
                  log.info('service[%s], gone is service[%j]', service, oldListings[i]);
                }
              }
              for (i = 0; i < serviceListings.length; ++i) {
                if (! oldListings.some(_.isEqual.bind(_, serviceListings[i]))) {
                  log.info('service[%s], new is listing[%j]', service, serviceListings[i]);
                }
              }
            }
            cb();
          });
        },
        config.heartbeatInterval
      );

      return {
        get: function () {
          return serviceListings;
        },

        close: function() {
          shouldWatch = false;
        }
      };
    },

    watchers: watchers
  };
};