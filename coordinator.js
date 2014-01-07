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

  var config = require('./env.js');

  function run() {
    var coordinatorBroker = require('./lib/server/coordinatorBroker.js')(
      { host: config.host + ':' + config.port },
      config.discovery
    );
    var listingsBroker = require('./lib/server/listingsBroker.js')(config.discovery);
    require("./lib/server/coordinatorServer.js")(coordinatorBroker, listingsBroker, config.discovery).start();
  }

  run();
}).call(this);
