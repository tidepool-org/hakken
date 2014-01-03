/*
 * == TIDEPOOL LICENSE ==
 * Copyright (C) 2013 Tidepool Project
 * 
 * This source code is subject to the terms of the Tidepool Open Data License, v. 1.0.
 * If a copy of the license was not provided with this file, you can obtain one at:
 *     http://tidepool.org/license/
 * 
 * == TIDEPOOL LICENSE ==
 */

(function() {
  'use strict';

  var restify = require('restify');

  var config = require('./env.js');
  var log = require('./lib/log.js')('server.js');

  var serverFactory = require('./lib/common/serverFactory.js');

  function run() {
    var polling = require('./lib/common/polling.js');
    
    var coordinatorBroker = require('./lib/server/coordinatorBroker.js')(
      { host: config.host + ':' + config.port },
      config.discovery,
      require('./common/coordinatorClient.js'),
      polling
    );
    
    var listingsBroker = require('./server/listingsBroker.js')(
      config.discovery, polling      
    );

    require("./server/coordinatorServer.js")(
      serverFactory, coordinatorBroker, listingsBroker, config.discovery
    ).start();
  }

  run();
}).call(this);
