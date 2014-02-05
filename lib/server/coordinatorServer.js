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