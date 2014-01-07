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