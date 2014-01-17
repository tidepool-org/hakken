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

var _ = require('lodash');
var async = require('async');

var coordinatorClientFactory = require('../lib/common/coordinatorClient.js');
var log = require('../lib/log.js')('integrated.js');
var except = require('../lib/common/except.js');
var pre = require('../lib/common/pre.js');

(function(){
  var discoveryConfig = {
    host: 'localhost:19000',
    heartbeatInterval: 2000,
    pollInterval: 2000,
    resyncInterval: 6000,
    missedHeartbeatsAllowed: 3
  };

  function makeCoordinatorServer(config) {
    var coordinatorBroker = require('../lib/server/coordinatorBroker.js')(config, discoveryConfig);
    var listingsBroker = require('../lib/server/listingsBroker.js')(discoveryConfig);
    return require("../lib/server/coordinatorServer.js")(coordinatorBroker, listingsBroker, config);
  }

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

    var hakkenPublish = hakken.client.make();
    var hakkenSubscribe = hakken.client.make();

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