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