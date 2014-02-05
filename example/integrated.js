/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
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