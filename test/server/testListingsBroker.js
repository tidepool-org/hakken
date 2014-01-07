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

describe("listingsBroker.js", function(){
  var factory = require('../../lib/server/listingsBroker.js');

  var config = { 
    heartbeatInterval: 60000,
    missedHeartbeatsAllowed: 3
  };
  var listingsBroker;
  var heartbeatFn;

  var polling = mockableObject.make("repeat");
  var timeProvider = mockableObject.make("getTime");

  describe("listings", function(){
    beforeEach(function() {
      mockableObject.reset(polling, timeProvider);

      sinon.stub(polling, "repeat");
      listingsBroker = factory(config, polling, timeProvider);

      expect(polling.repeat).have.been.calledOnce;
      expect(polling.repeat).have.been.calledWith(
        "heartbeat-checker", sinon.match.func, config.heartbeatInterval
      );

      heartbeatFn = polling.repeat.getCall(0).args[1];

      mockableObject.reset(polling);
    });

    var heartbeatCheckAt = function(time) {
      timeProvider.getTime.returns(time);
      heartbeatFn(function(){});
    }

    it("should start with no listings", function() {
      expect(listingsBroker.getServices()).is.empty;
    });

    var listing1 = {service: 'testService', host: 'localhost:2223', name: '770'};
  
    it("should be able to be added", function() {
      sinon.stub(timeProvider, "getTime").returns(new Date().getTime());
      listingsBroker.addListing(listing1);
      hasListings(listing1);
    });

    it("should be able to add a listing via heartbeat", function(){
      sinon.stub(timeProvider, "getTime").returns(new Date().getTime());
      listingsBroker.listingHeartbeat(listing1);
      hasListings(listing1);
    });

    it("should return no services when a listing is removed", function(){
      sinon.stub(timeProvider, "getTime").returns(0);
      listingsBroker.addListing(listing1);
      hasListings(listing1);
      heartbeatCheckAt(config.heartbeatInterval * 3 + 1);

      expect(listingsBroker.getServices()).is.empty;
      expect(listingsBroker.getServiceListings(listing1.service)).is.null;
    });

    it("should automatically remove listings based on a lack of heartbeats", function() {
      var anotherListing = {service: 'testService', host: 'localhost:2224', name:'007'};

      sinon.stub(timeProvider, "getTime");

      timeProvider.getTime.returns(0);
      listingsBroker.addListing(listing1);

      timeProvider.getTime.returns(config.heartbeatInterval * 10);
      listingsBroker.addListing(anotherListing);
      hasListings(listing1, anotherListing);

      heartbeatCheckAt(config.heartbeatInterval);
      hasListings(listing1, anotherListing);

      heartbeatCheckAt(config.heartbeatInterval * 3);
      hasListings(listing1, anotherListing);

      heartbeatCheckAt((config.heartbeatInterval * 3) + 1);
      hasListings(anotherListing);

      heartbeatCheckAt(config.heartbeatInterval * 13);
      hasListings(anotherListing);

      timeProvider.getTime.returns((config.heartbeatInterval * 13));
      listingsBroker.listingHeartbeat(anotherListing);
      heartbeatCheckAt((config.heartbeatInterval * 13) + 1);
      hasListings(anotherListing);

      heartbeatCheckAt(config.heartbeatInterval * 16);
      hasListings(anotherListing);

      heartbeatCheckAt((config.heartbeatInterval * 16) + 1);
      expect(listingsBroker.getServices()).is.empty;
    });
  });

  function hasListings() {
    var services = {};
    var serviceNames = listingsBroker.getServices();
    for (var i = 0; i < arguments.length; ++i) {
      var service = arguments[i].service;
      if (services[service] == null) {
        var serviceListings = listingsBroker.getServiceListings(service);
        expect(serviceListings).to.exist;
        services[service] = serviceListings;
      }
      expect(remove(services[service], arguments[i])).is.not.null;
      remove(serviceNames, service);
    }
    expect(serviceNames).is.empty;
  }

  function remove(array, elem) {
    var index = array.indexOf(elem);
    if (index > -1) {
      return array.splice(index, 1);
    }
    return null;
  }
});