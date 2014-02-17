/*
 * == BSD2 LICENSE ==
 */

var pre = require('amoeba').pre;

exports.random = function(client, config) {
  return client.randomWatch(pre.hasProperty(config, 'service'), config.filter, config.config);
};

exports.static = function(client, config) {
  return client.staticWatch(pre.hasProperty(config, 'hosts'));
};