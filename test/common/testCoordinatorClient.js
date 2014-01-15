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