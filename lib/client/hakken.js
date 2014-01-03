var util = require('util');

var _ = require('lodash');
var async = require('async');

var except = require('../common/except.js');
var log = require('../log.js')('hakken.js');
var pre = require('../common/pre.js');

module.exports = function hakken(config, coordinatorClientFactory, polling){
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

  function addCoordinator(coordinator) {
    var host = coordinator.host;
    var client = coordinatorClientFactory(coordinator);
    coordinators[host] = {
      payload: coordinator,
      client: client
    };
    coordQueue.push(client);
    polling.repeat(
      util.format('coordinator-poller-%s', host);
      loadCoordinators.bind(null, host),
      config.pollInterval
    );
  }

  function removeCoordinator(host) {
    delete coordinators[host];
    var complete = false;
    var index = 0;
    while (! complete) {
      for (index = 0; index < coordQueue.length; ++index) {
        if (host === coordQueue[index].getHost()) {
          coordQueue.splice(index, 1);
          break; // splice mutates the list, so break and re-enter
        }
      }
      complete = true;
    }
  }

  function handleCoordinator(coordinator) {
    var foundHost = coordinator.host;
    if (coordinators[foundHost] == null) {
      log.info('New coordinator[%s] found!', foundHost);
      addCoordinator(coordinator);
    }
  }

  function loadCoordinators(host, cb) {
    if (coordinators[host] == null) {
      return cb({ message : util.format('unknown host[%s]', host)});
    }

    coordinators[host].client.getCoordinators(function(err, coords) {
      if (err != null) {
        var badHost = client.getHost();
        log.info('Error talking to a coordinator[%s].  Dropping.', badHost);
        removeCoordinator(badHost);
        cb('stop');
      }
      else {
        coords.forEach(handleCoordinator);
        cb();
      }
    });
  }

  function resync(cb) {
    if (! started) {
      cb('stop');
    }

    coordinatorClient.getCoordinators(function(err, coords) {
      if (err != null) {
        log.info('Unable to resync from host[%s]', coordinatorClient.getHost());
      }
      else {
        coords.forEach(handleCoordinator);
      }
      cb();
    });
  }

  function publishListing(listing) {
    async.map(
      coordQueue,
      function(client, cb) {
        client.listingHeartbeat(listing, function(err) {
          if (err != null) {
            log.error(err, 'Problem publishing listing[%j] to host[%s]', listing, client.getHost());
          }
          cb();
        });
      },
      function(err, results) {
        // do nothing.
      }
    );
  }

  function handleError(type, cb) {
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

  return {
    /*
      Starts hakken, how novel.

      cb - called when the first set of coordinators have been loaded.
    */
    start: function(cb){
      if (! started) {
        resync(function(err){
          if (err == null) {
            polling.repeat('coordinator-resync', resync, config.resyncInterval);
            polling.repeat(
              'service-publishing', 
              function(cb) {
                for (var i = 0; i < listings.length; ++i) {
                  publishListing(listings[i]);
                }
              },
              config.heartbeatInterval
            );
            started = true;      
          }

          cb(err);
        });
      }
    },

    /*
      Stops hakken.

      Starting again might or might not work.  Just create a new object.
    */
    stop: function(){
      if (started) {
        started = false;
        for (var host in coordinators) {
          removeCoordinator(host);
        }
        listings = [];
      }
    },

    /*
      Publishes a service described by the listing.

      listing - an partially opaque object representing a "service".  Must have properties:
        service - name of service being published
        host - FQDN used to contact the service
      cb - optional, if provided, will be called when 
    */
    publish: function(listing, cb) {
      pre.hasProperty(listing, 'service');
      pre.hasProperty(listing, 'host');

      if (started) {
        listings.push(listing);
        publishListing(listing);
      }
      else {
        handleError('throw', cb, 'Hakken not started.  Call start() first.');
      }
    },

    /*
      Starts a "watch" on a given service.  Returns an object that encapsulates the selection
      of an available instance.  It provides a get() method, which should be able to be used 
      to select an instance.

      service - the name of the service to watch
      selectorFn - a function(listings, otherArgs...) that should return an instance.  
        - listings - the current listings for the service
        - otherArgs... - arguments that were passed to the get() method, just passed through

      returns an object with a get() method that will return the results of the selectorFn on the
      current set of listings.
    */
    watch: function(service, selectorFn) {
      var serviceListings = [];

      polling.repeat(
        util.format('service-watch-%s', service),
        function(cb) {
          if (!started) {
            cb('stop');
          }

          if (coordQueue.length < 0) {
            log.warn('No known coordinators, not updating listings for service[%s]', service);
            return cb();
          }

          var client = coordQueue[0];
          client.getListings(service, function(err, newListings) {
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
        get: function() {
          if (arguments.length > 0) {
            return selectorFn.apply(null, [serviceListings].concat(Array.prototype.slice.call(arguments, 0)));  
          }
          return selectorFn(serviceListings);          
        }
      };
    }
  };
}