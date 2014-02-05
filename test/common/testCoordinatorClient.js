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

var fixture = require('../fixture.js');

var expect = fixture.expect;
var sinon = fixture.sinon;
var mockableObject = fixture.mockableObject;

function returnThis() { return this; }

describe('coordinatorClient.js', function(){
  var config = { host: 'testhost:1234' };
  var client;
  var superagent;
  beforeEach(function(){
    superagent = mockableObject.make('get', 'post');
    client = require('../../lib/common/coordinatorClient.js')(config, superagent);
  });

  describe('getCoordinators', function(){
    it("should provide the list of coordinators on 200", function(done){
      var retVal = {};
      sinon.stub(superagent, 'get').returns({ end: function(cb) {
        cb(null, { status: 200, body: retVal});
      }});
      client.getCoordinators(function(err, result){
        expect(superagent.get).to.have.been.calledWith('http://testhost:1234/v1/coordinator');
        expect(err).to.not.exist;
        expect(result).to.equal(retVal);
        done();
      });
    });

    it("should provide an error on 404", function(done){
      var retVal = {};
      sinon.stub(superagent, 'get').returns({ end: function(cb) {
        cb(null, { status: 404, clientError: true, body: retVal});
      }});
      client.getCoordinators(function(err, result){
        expect(superagent.get).to.have.been.calledWith('http://testhost:1234/v1/coordinator');
        expect(err).to.exist;
        expect(result).to.not.exist;
        done();
      });
    });

    it("should pass up the error on error", function(done){
      var retVal = {};
      sinon.stub(superagent, 'get').returns({ end: function(cb) {
        cb(retVal, null);
      }});
      client.getCoordinators(function(err, result){
        expect(superagent.get).to.have.been.calledWith('http://testhost:1234/v1/coordinator');
        expect(err).to.equal(retVal);
        expect(result).to.not.exist;
        done();
      });
    });
  });

  describe('addCoordinator', function(){
    it("should act sanely on the happy path", function(done){
      var retVal = {};
      sinon.stub(superagent, 'post').returns(
        {
          type: function(type){
            expect(type).to.equal('application/json');
            return this;
          },
          send: function(body) {
            expect(body).to.equal(retVal);
            return this;
          },
          end: function(cb) {
            cb(null, { status: 201 });
          }
        }
      );
      client.addCoordinator(retVal, function(err){
        expect(superagent.post).to.have.been.calledWith('http://testhost:1234/v1/coordinator');
        expect(err).to.not.exist;
        done();
      });
    });

    it("should provide an error on 4xx", function(done){
      var retVal = {};
      sinon.stub(superagent, 'post').returns(
        {
          type: returnThis,
          send: returnThis,
          end: function(cb) {
            cb(null, { status: 400, clientError: true });
          }
        }
      );
      client.addCoordinator(retVal, function(err){
        expect(superagent.post).to.have.been.calledWith('http://testhost:1234/v1/coordinator');
        expect(err).to.exist;
        done();
      });
    });

    it("should pass up the error on error", function(done){
      var error = {};
      sinon.stub(superagent, 'post').returns(
        {
          type: returnThis,
          send: returnThis,
          end: function(cb) {
            cb(error, null);
          }
        }
      );
      client.addCoordinator({ something: 'hi' }, function(err){
        expect(superagent.post).to.have.been.calledWith('http://testhost:1234/v1/coordinator');
        expect(err).to.equal(error);
        done();
      });
    });
  });

  describe('getListings', function(){
    it("should provide the array of listings on 200", function(done){
      var retVal = [{}, {}];
      sinon.stub(superagent, 'get').returns({ end: function(cb) {
        cb(null, { status: 200, body: retVal});
      }});
      client.getListings('billy', function(err, result){
        expect(superagent.get).to.have.been.calledWith('http://testhost:1234/v1/listings/billy');
        expect(err).to.not.exist;
        expect(result).to.equal(retVal);
        done();
      });
    });

    it("should provide an empty array of listings on 404", function(done){
      var retVal = [{}, {}];
      sinon.stub(superagent, 'get').returns({ end: function(cb) {
        cb(null, { status: 404, body: retVal});
      }});
      client.getListings('billy', function(err, result){
        expect(superagent.get).to.have.been.calledWith('http://testhost:1234/v1/listings/billy');
        expect(err).not.to.exist;
        expect(result).to.be.empty;
        done();
      });
    });

    it("should pass up the error on error", function(done){
      var retVal = {};
      sinon.stub(superagent, 'get').returns({ end: function(cb) {
        cb(retVal, null);
      }});
      client.getListings('billy', function(err, result){
        expect(superagent.get).to.have.been.calledWith('http://testhost:1234/v1/listings/billy');
        expect(err).to.equal(retVal);
        expect(result).to.not.exist;
        done();
      });
    });
  });

  describe('listingHeartbeat', function(){
    var listing = { host: 'another:1234', service: 'howdy' };
    var error;
    var res;
    beforeEach(function(){
      error = null;
      res = null;

      sinon.stub(superagent, 'post').returns(
        {
          type: function(type){
            expect(type).to.equal('application/json');
            return this;
          },
          send: function(body) {
            expect(body).to.equal(listing);
            return this;
          },
          query: function(q) {
            expect(q).to.deep.equal({ heartbeat: true });
            return this;
          },
          end: function(cb) {
            cb(error, res);
          }
        }
      );
    });

    it("should act sanely on the happy path", function(done){
      res = { status: 201 };
      client.listingHeartbeat(listing, function(err){
        expect(superagent.post).to.have.been.calledWith('http://testhost:1234/v1/listings');
        expect(err).to.not.exist;
        done();
      });
    });

    it("should provide an error on 4xx", function(done){
      res = { status: 400, clientError: true };
      client.listingHeartbeat(listing, function(err){
        expect(superagent.post).to.have.been.calledWith('http://testhost:1234/v1/listings');
        expect(err).to.exist;
        done();
      });
    });

    it("should pass up the error on error", function(done){
      error = {};
      client.listingHeartbeat(listing, function(err){
        expect(superagent.post).to.have.been.calledWith('http://testhost:1234/v1/listings');
        expect(err).to.equal(error);
        done();
      });
    });
  });
});