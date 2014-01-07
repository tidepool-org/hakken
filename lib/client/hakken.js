var util = require('util');

var _ = require('lodash');
var async = require('async');

var except = require('../common/except.js');
var log = require('../log.js')('hakken.js');
var pre = require('../common/pre.js');

module.exports = function hakken(config, coordinatorClientFactory, polling)
{
  if (coordinatorClientFactory == null) {
    coordinatorClientFactory = require('../common/coordinatorClient.js');
  }
  if (polling == null) {
    polling = require('../common/polling.js');
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
            return cb({ message: util.format('unknown host[%s]', foundHost)});
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
          return cb('not started!');
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
          return cb('not started!');
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
    stop: function ()
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
     selectorFn - a function(listings, otherArgs...) that should return an instance.
     -- listings - the current listings for the service
     -- otherArgs... - arguments that were passed to the get() method are just passed through

     returns an object with a get() method that will return the result of the selectorFn on the
     current set of listings.
     */
    watch: function (service, selectorFn)
    {
      var serviceListings = [];
      var shouldWatch = true;

      polling.repeat(
        util.format('service-watch-%s', service),
        function (cb) {
          if (!started) {
            cb('hakken stopped!');
          }

          if (!shouldWatch) {
            cb('watch stopped!');
          }

          if (coordQueue.length < 0) {
            log.warn('No known coordinators, not updating listings for service[%s]', service);
            return cb();
          }

          var client = coordQueue[0];
          client.getListings(service, function (err, newListings) {
            if (err != null) {
              log.warn(err, 'Error updating listings for service[%s] from host[%s]', service, client.getHost());
            }
            else {
              serviceListings = newListings;
            }
            cb();
          });
        },
        config.heartbeatInterval
      );

      return {
        get: function () {
          if (arguments.length > 0) {
            return selectorFn.apply(null, [serviceListings].concat(Array.prototype.slice.call(arguments, 0)));
          }
          return selectorFn(serviceListings);
        },

        stop: function() {
          shouldWatch = false;
        }
      };
    }
  };
}