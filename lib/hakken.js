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

var pre = require('./common/pre.js');

/**
 * Constructs the public API of Hakken.  The returned object has two fields: client and server.
 *
 * client is used to interact with hakken as a client
 *
 * server is used to start up a hakken server
 *
 * @param config - required, takes parameters host, heartbeatInterval, missedHeartbeatsAllowed and resyncPollInterval
 * @param log - optional, if provided should have normal logging methods like debug, info, warn, error
 * @param polling - optional, used to schedule "repeat" operations.  Can be provided to override behavior,
 *                  but the API is not considered stable, so override at own risk
 * @param serverFactory - optional, used to create the server object that has endpoints registered with it,
 *                        API not considered stable, so override at own risk.
 * @param coordinatorClientFactory - optional, used to create client code for talking to hakken coordinators,
 *                                   API not considered stable, so override at own risk.
 * @returns {{client: *, server: *}}
 */
module.exports = function(config, log, polling, serverFactory, coordinatorClientFactory) {
  if (polling == null) {
    polling = require('./common/polling.js');
  }
  if (serverFactory == null) {
    serverFactory = require('./common/serverFactory.js');
  }
  if (coordinatorClientFactory == null) {
    coordinatorClientFactory = require('./common/coordinatorClient.js');
  }

  pre.hasProperty(config, 'host');
  pre.defaultProperty(config, 'heartbeatInterval', 20000);
  pre.defaultProperty(config, 'pollInterval', 60000);
  pre.defaultProperty(config, 'resyncInterval', config.pollInterval * 10);
  pre.defaultProperty(config, 'missedHeartbeatsAllowed', 3);


  return {
    client: require('./client/api.js')(config, log, coordinatorClientFactory, polling),
    server: require('./server/api.js')(config, coordinatorClientFactory, polling, serverFactory)
  };
};