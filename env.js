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

var config = require('amoeba').config;

module.exports = (function(){
  var env = {};

  // The host to announce for this node
  env.host = config.fromEnvironment('ANNOUNCE_HOST');
  
  // The port to listen on
  env.port = config.fromEnvironment('PORT', 8082);

  env.discovery = {};

  // FQDN of host to use for discovery.  
  // This is often a load balancer that fronts all coordinators
  env.discovery.host = config.fromEnvironment('DISCOVERY_HOST');

  // The amount of time to wait between heartbeats in milliseconds.
  env.discovery.heartbeatInterval = config.fromEnvironment('DISCOVERY_HEARTBEAT_INTERVAL', 60000);

  // The number of heartbeats that can be missed before a listing is reaped
  env.discovery.missedHeartbeatsAllowed = config.fromEnvironment('MISSED_HEARTBEATS_ALLOWED', 3);

  // Amount of time to wait between resynchronization of the coordinators in milliseconds
  // This determines how often the coordinators attempt to discover "new"
  // coordinators by asking discovery.host for the current set of coordinators
  env.discovery.resyncPollInterval = config.fromEnvironment('RESYNC_POLL_INTERVAL', null);

  // A config to allow you to turn off heartbeat logs.  They are chatty, but useful to help debug things, so it's
  // up to you.
  env.discovery.logHeartbeats = config.fromEnvironment('LOG_HEARTBEATS', 'true') === 'true';

  return env;
})();