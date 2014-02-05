/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
 */

var fixture = require('../fixture.js');

var sinon = fixture.sinon;
var expect = fixture.expect;
var supertest = fixture.supertest;
var mockableObject = fixture.mockableObject;

var config = {port: 23000};

describe("coordinatorServer.js", function(){
  var coordinatorBroker = mockableObject.make("addCoordinator", "getCoordinators");
  var listingsBroker = mockableObject.make(
    "addListing", "listingHeartbeat", "getServices", "getServiceListings"
  );

  var api;

  before(function(){
    var gossipServer = require('../../lib/server/coordinatorServer.js')(coordinatorBroker, listingsBroker, config);
    gossipServer.start();

    api = supertest('http://localhost:' + config.port);
  });

  beforeEach(function() {
    mockableObject.reset(coordinatorBroker, listingsBroker);
  });

  describe("v1", function(){
    describe("/coordinator", function(){
      before(function(){
        api = supertest('http://localhost:' + config.port + '/v1/coordinator');
      });

      it("returns result of coordinatorBroker.getCoordinators() on GET", function(done){
        var retVal = [{ howdy: "billy" }];
        sinon.stub(coordinatorBroker, 'getCoordinators').returns(retVal);

        api.get('')
           .expect('Content-Type', 'application/json')
           .expect(200, retVal, done);
      });

      it("adds a new coordinator on POST", function(done){
        sinon.stub(coordinatorBroker, 'addCoordinator');
        var coordinator = { host: 'you', number: 1 };

        api.post('')
           .set('Content-Type', 'application/json')
           .send(coordinator)
           .expect(201, function(err){
              expect(coordinatorBroker.addCoordinator).have.been.calledOnce;
              expect(coordinatorBroker.addCoordinator).have.been.calledWith(coordinator);
              done();
           });
      });
    });

    describe("/listings", function(){
      before(function(){
        api = supertest('http://localhost:' + config.port + '/v1/listings');
      });

      it("returns result of gossipHandler.getServices() on GET", function(done){
        var retVal = ["billy"];
        sinon.stub(listingsBroker, 'getServices').returns(retVal);

        api.get('')
           .expect('Content-Type', 'application/json')
           .expect(200, retVal, done);
      });

      it("adds a new agent on POST", function(done){
        sinon.stub(listingsBroker, 'addListing');
        var agent = {host: "billy", payload:"yay"};

        api.post('')
           .set('Content-Type', 'application/json')
           .send(agent)
           .expect(201, function(err){
              expect(listingsBroker.addListing).have.been.calledOnce;
              expect(listingsBroker.addListing).have.been.calledWith(agent);
              done();
           });
      });

      it("calls heartbeat on POST with heartbeat=true", function(done){
        sinon.stub(listingsBroker, 'listingHeartbeat');
        var agent = {host: "billy", payload:"yay"};

        api.post('')
           .set('Content-Type', 'application/json')
           .query({heartbeat: true})
           .send(agent)
           .expect(201, function(err){
              expect(listingsBroker.listingHeartbeat).have.been.calledOnce;
              expect(listingsBroker.listingHeartbeat).have.been.calledWith(agent);
              done();
           });
      });

      it("returns result of gossipHandler.getServiceListings()", function(done){
        var retVal = {service: "billy", payload: "yay"};
        sinon.stub(listingsBroker, 'getServiceListings').withArgs('billy').returns(retVal);

        api.get('/billy')
           .expect('Content-Type', 'application/json')
           .expect(200, retVal, done);
      });

      it("returns 404 when gossipHandler.getServiceListings() returns null", function(done){
        sinon.stub(listingsBroker, 'getServiceListings').withArgs('billy').returns(null);

        api.get('/billy')
           .expect(404, done);
      });      
    })
  });
});