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

module.exports = function (coordinatorBroker, listingsBroker, config, serverFactory) {
  if (serverFactory == null) {
    serverFactory = require('../common/serverFactory.js');
  }

  var server = serverFactory.makeServer('Hakken-Coordinator', config);

  server.withRestifyServer(function(restify){
    restify.get('/v1/coordinator', function(req, res, next) {
      res.send(200, coordinatorBroker.getCoordinators());
      return next();
    });

    restify.post('/v1/coordinator', function(req, res, next) {
      var coordinator = req.body;
      coordinatorBroker.addCoordinator(coordinator);
      res.send(201);
      return next();
    });

    restify.get('/v1/listings', function(req, res, next){
      res.send(200, listingsBroker.getServices());
      return next();
    });

    restify.get('/v1/listings/:service', function(req, res, next) {
      var listings = listingsBroker.getServiceListings(req.params.service);

      if (listings == null) {
        return res.send(404);
      }      
      res.send(200, listings);
      return next();
    });

    restify.post('/v1/listings', function(req, res, next) {
      var agent = req.body;
      var doHeartbeat = req.params['heartbeat'] != null;

      if (doHeartbeat) {
        listingsBroker.listingHeartbeat(agent);
      } 
      else {
        listingsBroker.addListing(agent);
      }
      
      res.send(201);
      return next();
    });
  });

  return server;
};