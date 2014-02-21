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

var except = require('amoeba').except;
var pre = require('amoeba').pre;
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
  pre.hasProperty(config, 'logHeartbeats');

  log.info('Creating listings broker with config[%j]', config);

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
      if (config.logHeartbeats) {
        log.info("Heartbeat for listing[%j]", listing);
      }

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