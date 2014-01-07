var util = require('util');

var superagent = require('superagent');

var except = require('./except.js');
var pre = require('./pre.js');

module.exports = function(config) {
  pre.hasProperty(config, 'host');

  var host = config.host;
  if (config.port != null) {
    host = util.format('%s:%s', host, config.port);
  }

  function makeError(err, res) {
    if (err == null) {
      return { Error: util.format('[%s]: %j', host, res.clientError ? res.body : res.error.message) };
    }
    return err;
  }

  function callbackForGET(cb) {
    return function(err, res) {
      if (res != null && res.status === 200) {
        return cb(null, res.body)
      }
      else {
        return cb(makeError(err, res), null);
      }
    };
  }

  function callbackForPOST(cb) {
    return function(err, res) {
      return cb(res != null && res.status === 201 ? null : makeError(err, res));
    };
  }

  return {
    // Returns a list of objects that each represent an available coordinator.
    getCoordinators: function(cb) {
      superagent.get(util.format('http://%s/v1/coordinator', host))
                .end(callbackForGET(cb));
    },
    addCoordinator: function(coordinator, cb) {
      superagent.post(util.format('http://%s/v1/coordinator', host))
                .type('application/json')
                .send(coordinator)
                .end(callbackForPOST(cb));
    },
    getListings : function(service, cb) {
      superagent.get(util.format('http://%s/v1/listings/%s', host, service))
                .end(callbackForGET(cb));
    },
    listingHeartbeat: function(listing, cb) {
      pre.hasProperty(listing, 'host');
      pre.hasProperty(listing, 'service');

      superagent.post(util.format('http://%s/v1/listings', host))
                .type('application/json')
                .query({ heartbeat: true })
                .send(listing)
                .end(callbackForPOST(cb));
    },
    getHost: function() {
      return host;
    }
  }
}