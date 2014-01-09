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

var restify = require('restify');

var except = require('./except.js');
var log = require('../log.js')('ServerFactory.js');

exports.makeServer = function(name, config) 
{
  var port = config.port;
  if (port == null) {
    if (config.host == null) {
      throw except.IAE("No 'port' or 'host' fields on config[%j], one of them must be set.", config);
    }
    port = config.host.split(':')[1];
  }


  var server = restify.createServer({
    name: name,
    formatters: {
      "application/json": function prettyJson(req, res, body) {
        var data = req.params && req.params.pretty !== undefined ? JSON.stringify(body, null, 2) : JSON.stringify(body);

        if (res.getHeader('Content-Length') === undefined
            && res.contentLength === undefined) {
          res.setHeader('Content-Length', Buffer.byteLength(data));
        }

        return data;
      }
    }
  });

  // Two standard restify handler plugins:
  server.use(restify.queryParser());
  server.use(restify.bodyParser({ mapParams : false }));

  server.get('/status', function(req, res, next) {
    res.send(200, 'OK');
    return next();
  });

  return {
    withRestifyServer: function(withServerCb) {
      return withServerCb(server);
    },
    start: function () {
      log.info('%s serving on port[%s]', name, port);
      server.listen(port);
      server.on('uncaughtException', function(req, res, route, error){
        if (error.name === 'IllegalArgumentException') {
          log.info(error, 'Returning 400 for an IllegalArgumentException[%s]', error.message);
          res.send(400, error.message);
        }
        else {
          log.warn(
            error, 
            "%s: Uncaught Exception on req[%s] for route[%s %s]: %s", 
            name, req.id(), route.spec.path, route.spec.method, error.message
          );
          res.send(500, util.format("Server Error: %s", req.id()));
        }
      });
    },
    close: server.close
  };
};