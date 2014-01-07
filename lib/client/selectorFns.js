var _ = require('lodash');

exports.random = function(hosts) {
  if (hosts.length == 0) {
    return null;
  }
  return hosts[_.random(hosts.length)];
}