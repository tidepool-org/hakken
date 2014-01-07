var util = require('util');

var log = require('../log.js')('coordinatorBroker.js');

var except = require('../common/except.js');
var pre = require('../common/pre.js');

var getKey = function(elem) {
  var host = elem['host'];
  if (host == null) {
    throw except.IAE("Must specify a host property, got[%j]", elem);
  }
  return host;
}

module.exports = function(selfDescription, config, coordinatorClientFactory, polling) {
  if (coordinatorClientFactory == null) {
    coordinatorClientFactory = require('../common/coordinatorClient.js');
  }
  if (polling == null) {
    polling = require('../common/polling.js');
  }

  pre.hasProperty(config, 'heartbeatInterval');

  var coordinators = {};

  var coordinatorBlacklist = {};

  var selfKey = getKey(selfDescription);
  coordinators[selfKey] = selfDescription;

  var resyncClient = coordinatorClientFactory(config);

  var retVal = {
    addCoordinator: function(coordinator) {
      var self = this;

      log.info("Adding coordinator[%j]", coordinator);

      var key = getKey(coordinator);
      if (coordinators[key] != null) {
        log.info("Replacing existing coordinator [%j] with [%j].", coordinators[key], coordinator);
      }
      else {
        var coordinatorClient = coordinatorClientFactory(coordinator);
        polling.repeat(
          util.format("%s coordinator poll", key),
          function(cb){
            coordinatorClient.getCoordinators(function(err, coords) {
              if (err == null) {
                for (var i = 0; i < coords.length; ++i) {
                  var theirKey = getKey(coords[i]);
                  if (! coordinatorBlacklist[theirKey]) {
                    if (coordinators[theirKey] == null) {
                      self.addCoordinator(coords[i]);
                    }
                  }
                }
                return cb();
              }
              else {
                log.warn("Error talking to coordinator[%s], removing.", coordinatorClient.getHost());
                delete coordinators[key];
                coordinatorBlacklist[key] = true;
                return cb(false);
              }
            });
          },
          config.heartbeatInterval
        );
      }
      coordinators[key] = coordinator;
      coordinatorBlacklist[key] = false;
    },
    getCoordinators: function() {
      var list = [];
      for (var host in coordinators) {
        list.push(coordinators[host]);
      }
      return list;
    }
  };

  // Setup a periodic poll to make sure that all the coordinators know about each other
  polling.repeat(
    "resync-coordinators",
    function(cb) {
      resyncClient.getCoordinators(function(err, coords){
        if (err == null) {
          var theyKnowAboutMe = false;
          for (var i = 0; i < coords.length; ++i) {
            var key = getKey(coords[i]);
            if (key === selfKey) {
              theyKnowAboutMe = true;
            }
            else if (coordinators[key] == null) {
              retVal.addCoordinator(coords[i]);
            }
          }

          if (! theyKnowAboutMe) {
            resyncClient.addCoordinator(selfDescription, function(err) {
              if (err != null) {
                log.info(err, "Error adding self to remote coordinator[%s]", resyncClient.getHost());
              }
            });
          }
        }
        else {
          log.error(err, "Unable to resync from [%s] due to an error.", resyncClient.getHost());
        }
        return cb();
      });
    },
    config.resyncPollDuration || config.heartbeatInterval * 10
  );

  return retVal;
}