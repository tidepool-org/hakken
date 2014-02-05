/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
 */

module.exports = function(config, coordinatorClientFactory, polling, serverFactory) {
  return {
    makeCoordinatorBroker: require('./coordinatorBroker.js'),
    makeListingsBroker: require('./listingsBroker.js'),
    makeServer: require('./coordinatorServer.js'),
    makeSimple: function(host, port) {
      var coordinatorBroker = this.makeCoordinatorBroker(
        { host: host + ':' + port }, config, coordinatorClientFactory, polling
      );
      var listingsBroker = this.makeListingsBroker(config, polling);
      return this.makeServer(coordinatorBroker, listingsBroker, {port: port}, serverFactory);
    }
  }
};
