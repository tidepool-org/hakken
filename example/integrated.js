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

var _ = require('lodash');
var async = require('async');
var except = require('amoeba').except;

var coordinatorClientFactory = require('../lib/common/coordinatorClient.js');
var log = require('../lib/log.js')('integrated.js');

(function(){
  var discoveryConfig = {
    host: 'localhost:19000',
    heartbeatInterval: 2000,
    pollInterval: 2000,
    resyncInterval: 6000,
    missedHeartbeatsAllowed: 3
  };

  function main() {
    var hakken = require('../lib/hakken.js')(discoveryConfig);
    var conf1 = { host: 'localhost:19000' };
    var conf2 = { host: 'localhost:19001' };

    var server1 = hakken.server.makeSimple('localhost', 19000);
    var server2 = hakken.server.makeSimple('localhost', 19001);

    server1.start();
    server2.start();

    var client1 = coordinatorClientFactory(conf1);
    var client2 = coordinatorClientFactory(conf2);

    function checkCoordinators(cb) {
      async.parallel(
        [
          client1.getCoordinators.bind(client1),
          client2.getCoordinators.bind(client2)
        ],
        function(err, results) {
          if (err != null) {
            throw err;
          }

          if (! _.isEqual([[conf1, conf2], [conf2, conf1]], results)) {
            throw except.ISE("Not all coordinators known[%j]", results);
          }

          log.info('All coordinators known.');
          cb();
        }
      );
    }

    var hakkenPublish = hakken.client();
    var hakkenSubscribe = hakken.client();

    function doServices() {
      hakkenPublish.start();
      hakkenSubscribe.start();

      var listing = { service: 'integration', host: 'localhost:1978', extra: 'property'};
      hakkenPublish.publish(listing, function(err){
        var watch = hakkenSubscribe.randomWatch('integration');
        watch.start();

        log.info('Watch currently shows[%j]', watch.get());

        setTimeout(
          function() {
            if (! _.isEqual(watch.get(), [listing]) ) {
              log.info("Oh noes!");
              throw except.ISE("Listing didn't show up!? watch.get()[%j]", watch.get());
            }
            log.info("All seems well.");
            process.exit(0);
          },
          discoveryConfig.heartbeatInterval * 2
        );
      });
    }

    setTimeout(checkCoordinators.bind(null, doServices), discoveryConfig.resyncInterval);
  }

  main();
})();