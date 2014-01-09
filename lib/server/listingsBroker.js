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

var except = require('../common/except.js');
var pre = require('../common/pre.js');
var log = require('../log.js')('listingsBroker.js');

var getKeyChecked = function(key) {
  return function(elem) {
    var host = elem[key];
    if (host == null) {
      throw except.IAE("Must specify a %s property, got[%j]", key, elem);
    }
    return host;
  };
};

var getService = getKeyChecked('service');
var getHost = getKeyChecked('host');

module.exports = function(config, polling, timeProvider) {
  if (timeProvider == null) {
    timeProvider = {
      getTime: function() { 
        return new Date().getTime();
      }
    }
  }

  pre.hasProperty(config, 'heartbeatInterval');
  pre.hasProperty(config, 'missedHeartbeatsAllowed');

  // A map of service -> host -> entry
  var listings = {};

  var _heartbeat = function(service, host) {
    if (listings[service] == null) {
      throw except.IAE("Cannot register a heartbeat on an unknown service[%s]", service);
    }

    if (listings[service][host] == null) {
      throw except.IAE("Service[%s], unknown host[%s], heartbeat... DENIED!", service, host);
    }

    listings[service][host].heartbeat = timeProvider.getTime();
  };

  var retVal = {
    addListing: function(listing) {
      log.info("Adding listing[%j]", listing);

      var service = getService(listing);
      if (listings[service] == null) {
        listings[service] = {};
      }

      var host = getHost(listing);
      if (listings[service][host] != null) {
        log.info(
          "Asked to add listing that already exists!?  Replacing [%j] with [%j].", listings[service][host], listing
        );
      }
      listings[service][host] = { payload: listing };
      _heartbeat(service, host);
    },
    listingHeartbeat: function(listing) {
      log.info("Heartbeat for listing[%j]", listing);

      var service = getService(listing);
      var host = getHost(listing);
      if (listings[service] == null || listings[service][host] == null) {
        this.addListing(listing);
      }
      else {
        _heartbeat(service, host);
      }
    },
    getServices: function() {
      return Object.keys(listings);
    },
    getServiceListings: function(service) {
      if (listings[service] == null) {
        return null;
      }

      var retVal = [];
      for (var host in listings[service]) {
        retVal.push(listings[service][host].payload);
      }
      return retVal;
    }
  };

  polling.repeat(
    "heartbeat-checker",
    function(cb) {
      var currTime = timeProvider.getTime() - (config.heartbeatInterval * config.missedHeartbeatsAllowed);
      for (var service in listings) {
        for (var host in listings[service]) {
          var currBeat = listings[service][host].heartbeat;
          var drop = false;
          if (currBeat == null) {
            log.warn("Service[%s], host[%s] with null heartbeat!?", service, host);
            drop = true;
          }
          else if (currBeat < currTime) {
            drop = true;
          }

          if (drop) {
            log.info("Dropping service[%s], host[%s]", service, host);
            delete listings[service][host];

            if (_.isEmpty(listings[service])) {
              delete listings[service];
            }
          }
        }
      }
      return cb();
    },
    config.heartbeatInterval
  );

  return retVal;
};