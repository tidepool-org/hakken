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

var config = require('./lib/common/config.js');

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

  return env;
})();