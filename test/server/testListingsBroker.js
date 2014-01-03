var fixture = require('../fixture.js');

var expect = fixture.expect;
var sinon = fixture.sinon;
var mockableObject = fixture.mockableObject;

describe("listingsBroker.js", function(){
  var factory = require('../../lib/server/listingsBroker.js');

  var config = { 
    heartbeatDuration: 60000,
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
        "heartbeat-checker", sinon.match.func, config.heartbeatDuration
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
      heartbeatCheckAt(config.heartbeatDuration * 3 + 1);

      expect(listingsBroker.getServices()).is.empty;
      expect(listingsBroker.getServiceListings(listing1.service)).is.null;
    });

    it("should automatically remove listings based on a lack of heartbeats", function() {
      var anotherListing = {service: 'testService', host: 'localhost:2224', name:'007'};

      sinon.stub(timeProvider, "getTime");

      timeProvider.getTime.returns(0);
      listingsBroker.addListing(listing1);

      timeProvider.getTime.returns(config.heartbeatDuration * 10);
      listingsBroker.addListing(anotherListing);
      hasListings(listing1, anotherListing);

      heartbeatCheckAt(config.heartbeatDuration);
      hasListings(listing1, anotherListing);

      heartbeatCheckAt(config.heartbeatDuration * 3);
      hasListings(listing1, anotherListing);

      heartbeatCheckAt((config.heartbeatDuration * 3) + 1);
      hasListings(anotherListing);

      heartbeatCheckAt(config.heartbeatDuration * 13);
      hasListings(anotherListing);

      timeProvider.getTime.returns((config.heartbeatDuration * 13));
      listingsBroker.listingHeartbeat(anotherListing);
      heartbeatCheckAt((config.heartbeatDuration * 13) + 1);
      hasListings(anotherListing);

      heartbeatCheckAt(config.heartbeatDuration * 16);
      hasListings(anotherListing);

      heartbeatCheckAt((config.heartbeatDuration * 16) + 1);
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