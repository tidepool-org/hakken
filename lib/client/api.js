/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
 */

module.exports = function(config, log, coordinatorClientFactory, polling) {
  return {
    make: function() {
      return require('./client.js')(config, log, coordinatorClientFactory, polling);
    },
    watchers: require('./updaters.js')
  }
};
