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

var fixture = require('../fixture.js');

var expect = fixture.expect;
var sinon = fixture.sinon;
var mockableObject = fixture.mockableObject;

function makeClient(){
  return mockableObject.make("getCoordinators", "addCoordinator", "getHost");
}

describe("coordinatorBroker.js", function(){
  var factory = require('../../lib/server/coordinatorBroker.js');

  var self = {host: 'localhost:1234', name: 'test'};
  var config = {host: 'coordinator.lb', port: 1234, heartbeatInterval: 60000};
  var gossipHandler;

  var coordinatorClientFactory = sinon.stub();
  var polling = mockableObject.make("repeat");

  it("should start resyncing on construction", function(){
    coordinatorClientFactory.reset();
    mockableObject.reset(polling);

    sinon.stub(polling, "repeat");
    
    var client = makeClient();
    coordinatorClientFactory.returns(client);
    gossipHandler = factory(self, config, coordinatorClientFactory, polling);
    expect(gossipHandler).to.exist;

    expect(polling.repeat).have.been.calledOnce;
    expect(polling.repeat).have.been.calledWith('resync-coordinators', sinon.match.func, config.heartbeatInterval * 10);

    // It should have itself registered right now
    expect(gossipHandler.getCoordinators()).to.deep.equal([self]);

    // Setup the client to return a new coordinator
    var newCoordinator = {host: 'localhost:2222'};
    sinon.stub(client, "getCoordinators").callsArgWith(0, null, [newCoordinator]);

    // The new coordinator list won't have "me", so it should try to register itself
    sinon.stub(client, "addCoordinator").callsArg(1);

    // Call the "repeat" fn with a new coordinator
    polling.repeat.getCall(0).args[1](function(arg){ expect(arg).undefined });

    expect(gossipHandler.getCoordinators()).to.deep.equal([self, newCoordinator]);
    expect(client.addCoordinator).have.been.calledOnce;
    expect(client.addCoordinator).have.been.calledWith(self);
  });

  describe("post-construction", function(){
    beforeEach(function() {
      coordinatorClientFactory.reset();
      mockableObject.reset(polling);

      sinon.stub(polling, "repeat");
      coordinatorClientFactory.returns(null);
      gossipHandler = factory(self, config, coordinatorClientFactory, polling);

      coordinatorClientFactory.reset();
      mockableObject.reset(polling);
    });

    describe("coordinators", function(){
      it("should be able to add a new coordinator and start polling it.", function() {
        var coordinator = {host: 'localhost:2222', name: 'billybill'};

        var client = makeClient();
        coordinatorClientFactory.returns(client);
        sinon.stub(polling, "repeat");

        gossipHandler.addCoordinator(coordinator);
        expect(gossipHandler.getCoordinators()).to.deep.equal([self, coordinator]);
        expect(polling.repeat).have.been.calledWith(sinon.match.string, sinon.match.func, config.heartbeatInterval);

        // Setup the client to return a new coordinator
        var newCoordinator = {host: 'localhost', port: 22222};
        sinon.stub(client, "getCoordinators").callsArgWith(0, null, [newCoordinator]);

        // Call the "repeat" fn with a new coordinator
        polling.repeat.getCall(0).args[1](function(arg){ expect(arg).undefined });

        expect(gossipHandler.getCoordinators()).to.deep.equal([self, coordinator, newCoordinator]);
      });
    });
  });
});