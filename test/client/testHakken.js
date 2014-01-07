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

var hakkenFactory = require('../../lib/client/hakken.js');

var defaultHeartbeat = 20000;
var defaultPoll = 60000;
var defaultResync = 60000 * 10;

describe('hakken.js', function(){
  describe('publish', function() {
    var coordinatorClientFactory = sinon.stub();
    var polling = mockableObject.make('repeat');
    var hakkenConfig = { host: 'test' };
    var testClient = mockableObject.make('getCoordinators', 'getHost');

    var hakken;

    beforeEach(function () {
      coordinatorClientFactory.reset();
      mockableObject.reset(polling, testClient);

      coordinatorClientFactory.returns(testClient);
      hakken = hakkenFactory(hakkenConfig, null, coordinatorClientFactory, polling);

      expect(coordinatorClientFactory).have.been.calledOnce;
      expect(coordinatorClientFactory).have.been.calledWith(
        {
          host: hakkenConfig.host,
          heartbeatInterval: defaultHeartbeat,
          pollInterval: defaultPoll,
          resyncInterval: defaultResync
        }
      );
      coordinatorClientFactory.reset();
    });

    it('starts unconditionally with no callback', function(){
      sinon.stub(polling, 'repeat');
      hakken.start();
      expect(polling.repeat).have.been.calledTwice;
      expect(polling.repeat).have.been.calledWith('coordinator-resync', sinon.match.func, defaultResync);
      expect(polling.repeat).have.been.calledWith('service-publishing', sinon.match.func, defaultHeartbeat);
    });

    it("doesn't start if an error is thrown", function(done){
      var err = { message: 'test-error' };
      sinon.stub(testClient, 'getCoordinators').callsArgWith(0, err);
      sinon.stub(testClient, 'getHost').returns('test');
      hakken.start(function(error) {
        expect(error).to.exist;
        expect(error).to.deep.equal(err);
        done();
      });
    });

    it("starts polling if it gets some coordinators when given a callback", function(done){
      sinon.stub(testClient, 'getCoordinators').callsArgWith(0, null, []);
      sinon.stub(polling, 'repeat');
      hakken.start(function(err) {
        expect(err).to.not.exist;
        expect(testClient.getCoordinators).have.been.calledOnce;
        expect(polling.repeat).have.been.calledTwice;
        expect(polling.repeat).have.been.calledWith('coordinator-resync', sinon.match.func, defaultResync);
        expect(polling.repeat).have.been.calledWith('service-publishing', sinon.match.func, defaultHeartbeat);
        done();
      });
    });

    describe("started", function(){
      var resyncFn;
      var publishFn;

      beforeEach(function(){
        mockableObject.reset(polling);

        sinon.stub(polling, 'repeat');
        hakken.start();
        expect(polling.repeat).have.been.calledTwice;
        expect(polling.repeat).have.been.calledWith('coordinator-resync', sinon.match.func, defaultResync);
        expect(polling.repeat).have.been.calledWith('service-publishing', sinon.match.func, defaultHeartbeat);

        resyncFn = polling.repeat.getCall(0).args[1];
        publishFn = polling.repeat.getCall(1).args[1];

        mockableObject.reset(polling);
      });

      it("stops when stopped", function(){
        hakken.stop();
        resyncFn(function(err){
          expect(err).to.equal('not started!');
        });
        publishFn(function(err){
          expect(err).to.equal('not started!');
        })
      });

      it("add coordinators on resync", function(){
        sinon.stub(testClient, 'getCoordinators').callsArgWith(0, null, [{host: 'test-host'}]);

        var testHostClient = mockableObject.make('getCoordinators');
        coordinatorClientFactory.returns(testHostClient);

        sinon.stub(polling, 'repeat');

        resyncFn(function(err) {
          expect(coordinatorClientFactory).have.been.calledOnce;
          expect(testClient.getCoordinators).have.been.calledOnce;
          expect(polling.repeat).have.been.calledOnce;
          expect(polling.repeat).have.been.calledWith('coordinator-poller-test-host', sinon.match.func, defaultPoll);
          expect(hakken.getCoordinators()).to.deep.equals(['test-host']);
        });
      });

      it("never updates the watch without coordinators", function(done){
        sinon.stub(polling, 'repeat');
        var watch = hakken.watch('billy');

        expect(polling.repeat).have.been.calledOnce;

        var watchFn = polling.repeat.getCall(0).args[1];
        expect(watch.get()).is.empty;
        watchFn(function (err) {
          expect(watch.get()).is.empty;
          done();
        });
      });

      describe('with coordinators', function(){
        var client1 = mockableObject.make('getCoordinators', 'getListings', 'getHost', 'listingHeartbeat');
        var client2 = mockableObject.make('getCoordinators', 'getListings', 'getHost', 'listingHeartbeat');

        var poller1;
        var poller2;

        beforeEach(function(done){
          mockableObject.reset(client1, client2);
          sinon.stub(testClient, 'getCoordinators').callsArgWith(0, null, [{host: 'client1'}, {host: 'client2'}]);

          coordinatorClientFactory.withArgs({host: 'client1'}).returns(client1);
          coordinatorClientFactory.withArgs({host: 'client2'}).returns(client2);

          sinon.stub(polling, 'repeat');

          resyncFn(function(err) {
            expect(coordinatorClientFactory).have.been.calledTwice;
            expect(testClient.getCoordinators).have.been.calledOnce;
            expect(polling.repeat).have.been.calledTwice;
            expect(polling.repeat).have.been.calledWith('coordinator-poller-client1', sinon.match.func, defaultPoll);
            expect(polling.repeat).have.been.calledWith('coordinator-poller-client2', sinon.match.func, defaultPoll);

            poller1 = polling.repeat.getCall(0).args[1];
            poller2 = polling.repeat.getCall(1).args[1];
            expect(hakken.getCoordinators()).deep.equals(['client1', 'client2']);

            mockableObject.reset(client1, client2, poller1, poller2);
            sinon.stub(client1, 'getHost').returns('client1');
            sinon.stub(client2, 'getHost').returns('client2');
            done();
          });
        });

        it("should remove a coordinator on failure to poll", function(done){
          expect(hakken.getCoordinators()).deep.equals(['client1', 'client2']);
          sinon.stub(client1, 'getCoordinators').callsArgWith(0, { message: 'failure!' });
          poller1(function(err){
            expect(err).equals('stop');
            expect(client1.getCoordinators).have.been.calledOnce;
            expect(hakken.getCoordinators()).deep.equals(['client2']);
            done();
          })
        });

        it("should remove a coordinator on failure to poll-2", function(done){
          expect(hakken.getCoordinators()).deep.equals(['client1', 'client2']);
          sinon.stub(client2, 'getCoordinators').callsArgWith(0, { message: 'failure!' });
          poller2(function(err){
            expect(err).equals('stop');
            expect(client2.getCoordinators).have.been.calledOnce;
            expect(hakken.getCoordinators()).deep.equals(['client1']);
            done();
          });
        });

        it("doesn't add coordinators if they already exist", function(done){
          sinon.stub(client1, 'getCoordinators').callsArgWith(0, null, [{host: 'client1'}, {host: 'client2'}]);
          poller1(function(err){
            expect(err).to.not.exist;
            expect(client1.getCoordinators).have.been.calledOnce;
            mockableObject.reset(client1);

            sinon.stub(client2, 'getCoordinators').callsArgWith(0, null, [{host: 'client1'}]);
            poller2(function(error){
              expect(error).to.not.exist;
              expect(client2.getCoordinators).have.been.calledOnce;
              done();
            })
          });
        });

        it("doesn't publish anything without publish() getting called", function(done){
          publishFn(function(err){
            expect(err).to.not.exist;
            done();
          });
        });

        it("submits service listings to all nodes immediately upon registration", function(){
          sinon.stub(client1, 'listingHeartbeat').callsArgWith(1, null);
          sinon.stub(client2, 'listingHeartbeat').callsArgWith(1, null);

          var listing = {service: 'billy', host: 'me'};

          expect(hakken.getListings()).is.empty;
          hakken.publish(listing);
          expect(client1.listingHeartbeat).have.been.calledOnce;
          expect(client1.listingHeartbeat).have.been.calledWith(listing, sinon.match.func);
          expect(client2.listingHeartbeat).have.been.calledOnce;
          expect(client2.listingHeartbeat).have.been.calledWith(listing, sinon.match.func);
        });

        it("submits service listings to all nodes immediately upon registration with callback", function(done){
          sinon.stub(client1, 'listingHeartbeat').callsArgWith(1, null);
          sinon.stub(client2, 'listingHeartbeat').callsArgWith(1, null);

          var listing = {service: 'billy', host: 'me'};

          expect(hakken.getListings()).is.empty;
          hakken.publish(listing, function(err){
            expect(err).to.not.exist;
            expect(client1.listingHeartbeat).have.been.calledOnce;
            expect(client1.listingHeartbeat).have.been.calledWith(listing, sinon.match.func);
            expect(client2.listingHeartbeat).have.been.calledOnce;
            expect(client2.listingHeartbeat).have.been.calledWith(listing, sinon.match.func);
            done();
          });
        });

        describe("with watch", function(){
          var watchFn;
          var watch;
          var transformFn = function(arg) { return arg; };

          beforeEach(function(){
            mockableObject.reset(polling);
            sinon.stub(polling, 'repeat');

            function delegate(){ return transformFn.apply(null, Array.prototype.slice.call(arguments, 0)) };
            watch = hakken.watch('billy', delegate);

            expect(polling.repeat).have.been.calledOnce;
            expect(polling.repeat).have.been.calledWith('service-watch-billy', sinon.match.func, defaultHeartbeat);

            watchFn = polling.repeat.getCall(0).args[1];

            expect(watch.get()).is.empty;

            mockableObject.reset(polling);
          });

          it("only checks one coordinator for watch", function(done){
            var listings = [{service: 'billy', host: 'billyHost'}];
            sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
            watchFn(function(err){
              expect(err).to.not.exist;
              expect(client1.getListings).have.been.calledOnce;
              expect(client1.getListings).have.been.calledWith('billy', sinon.match.func);
              expect(watch.get()).deep.equals(listings);
              done();
            });
          });

          it("falls back to other coordinators on coordinator failure", function(done){
            var listings = [{service: 'billy', host: 'billyHost'}];
            sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
            watchFn(function(err){
              expect(err).to.not.exist;
              expect(client1.getListings).have.been.calledOnce;
              expect(client1.getListings).have.been.calledWith('billy', sinon.match.func);
              expect(watch.get()).deep.equals(listings);

              client1.getListings.restore();

              expect(hakken.getCoordinators()).deep.equals(['client1', 'client2']);
              sinon.stub(client1, 'getCoordinators').callsArgWith(0, { message: 'failure!' });
              poller1(function(err){
                sinon.stub(client2, 'getListings').callsArgWith(1, null, listings);
                watchFn(function(err){
                  expect(err).to.not.exist;
                  expect(client2.getListings).have.been.calledOnce;
                  expect(client2.getListings).have.been.calledWith('billy', sinon.match.func);
                  expect(watch.get()).deep.equals(listings);
                  done();
                })
              });
            });
          });

          it("maintains old list of results on error", function(done){
            var listings = [{service: 'billy', host: 'billyHost'}];
            sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
            watchFn(function(err){
              expect(err).to.not.exist;
              expect(client1.getListings).have.been.calledOnce;
              expect(client1.getListings).have.been.calledWith('billy', sinon.match.func);
              expect(watch.get()).deep.equals(listings);

              client1.getListings.reset();
              client1.getListings.callsArgWith(1, { message: 'I failed you' });

              watchFn(function(err){
                expect(err).to.not.exist;
                expect(watch.get()).deep.equals(listings);
                done();
              });
            });
          });

          it("passes args to and transforms results with the selection function", function(done){
            var listings = [{service: 'billy', host: 'billyHost'}];
            sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
            watchFn(function(err){
              expect(err).to.not.exist;
              expect(client1.getListings).have.been.calledOnce;
              expect(client1.getListings).have.been.calledWith('billy', sinon.match.func);
              expect(watch.get()).deep.equals(listings);

              transformFn = function(arg, otherArg, yetAnotherArg) {
                expect(otherArg).equals('other');
                expect(yetAnotherArg).equals('yetAnother');
                expect(arg).equals(listings);
                return 'gotcha!';
              };

              expect(watch.get('other', 'yetAnother')).equals('gotcha!');

              done();
            });
          });
        });
      });
    });

  });
});