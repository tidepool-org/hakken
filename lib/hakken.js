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
    client: function() {
      return require('./client/client.js')(config, log, coordinatorClientFactory, polling);
    },
    server: require('./server/api.js')(config, coordinatorClientFactory, polling, serverFactory),
    updaters: require('./client/updaters.js')
  };
};