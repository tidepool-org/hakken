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

var hakkenFactory = require('../../lib/client/client.js');

var defaultHeartbeat = 20000;
var defaultPoll = 60000;
var defaultResync = 60000 * 10;
var defaultSkipHakken = false;

describe('hakken.js', function(){
  describe('publish', function() {
    var coordinatorClientFactory = sinon.stub();
    var polling = mockableObject.make('repeat');
    var hakkenConfig = { host: 'test', heartbeatInterval: defaultHeartbeat, pollInterval: defaultPoll, resyncInterval: defaultResync, skipHakken: defaultSkipHakken };
    var testClient = mockableObject.make('getCoordinators', 'getHost');

    var hakken;

    beforeEach(function () {
      coordinatorClientFactory.reset();
      mockableObject.reset(polling, testClient);
      sinon.stub(polling, 'repeat');

      coordinatorClientFactory.returns(testClient);
      hakken = hakkenFactory(hakkenConfig, null, coordinatorClientFactory, polling);

      expect(coordinatorClientFactory).have.been.calledOnce;
      expect(coordinatorClientFactory).have.been.calledWith(hakkenConfig);
      coordinatorClientFactory.reset();
    });

    it('starts unconditionally with no callback', function(){
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
      hakken.start(function(err) {
        expect(err).to.not.exist;
        expect(testClient.getCoordinators).have.been.calledOnce;
        expect(polling.repeat).have.been.calledTwice;
        expect(polling.repeat).have.been.calledWith('coordinator-resync', sinon.match.func, defaultResync);
        expect(polling.repeat).have.been.calledWith('service-publishing', sinon.match.func, defaultHeartbeat);
        done();
      });
    });

    describe('watcherFromConfig', function(){
      it('calls randomWatch with config stuff', function(){
        var config = {
          type: 'random',
          service: 'billy',
          filter: { tier: '1' },
          config: { numToPull: 3 }
        };

        var mockClient = mockableObject.make('randomWatch');
        sinon.stub(mockClient, 'randomWatch').returns('1234');
        var watch = hakken.watchFromConfig.bind(mockClient)(config);

        expect(watch).equals('1234');
        expect(mockClient.randomWatch).to.have.been.calledOnce;
        expect(mockClient.randomWatch).to.have.been.calledWith(
          config.service,
          config.filter,
          config.config
        );
      });

      it('converts a string argument into a randomWatch', function(){
        var mockClient = mockableObject.make('randomWatch');
        sinon.stub(mockClient, 'randomWatch').returns('1234');
        var watch = hakken.watchFromConfig.bind(mockClient)('billy');

        expect(watch).equals('1234');
        expect(mockClient.randomWatch).to.have.been.calledOnce;
        expect(mockClient.randomWatch).to.have.been.calledWith('billy');
      });

      it('calls randomWatch with config stuff', function(){
        var config = {
          type: 'static',
          hosts: [ { 123: 456 }]
        };

        var mockClient = mockableObject.make('staticWatch');
        sinon.stub(mockClient, 'staticWatch').returns('1234');
        var watch = hakken.watchFromConfig.bind(mockClient)(config);

        expect(watch).equals('1234');
        expect(mockClient.staticWatch).to.have.been.calledOnce;
        expect(mockClient.staticWatch).to.have.been.calledWith(config.hosts);
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

      it("stops when closed", function(){
        hakken.close();
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
        var watch = hakken.watch('billy');

        sinon.stub(polling, 'repeat');
        watch.start();

        expect(polling.repeat).have.been.calledOnce;

        var watchFn = polling.repeat.getCall(0).args[1];
        expect(watch.get()).is.empty;
        watchFn(function (err) {
          expect(watch.get()).is.empty;
          done();
        });
      });

      it("throws an exception when watch.get() is called without the watch being started", function(){
        var watch = hakken.watch('billy');

        var e = null;
        try {
          watch.get();
        }
        catch (err) {
          e = err;
        }
        expect(e).to.exist;
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

            mockableObject.reset(client1, client2, poller1, poller2, polling);
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

        it("should call the callback on a watch once it successfully gets some listings", function(done){
          var listings = [{service: 'billy', host: 'billyHost', tier: '1', tear: '1'}];
          sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
          watch = hakken.watch('billy', { tier: '1', tear: function(obj) { return obj.tear === '1'; } });

          sinon.stub(polling, 'repeat');
          watch.start(function(err){
            expect(polling.repeat).to.have.not.been.calledOnce;
            expect(client1.getListings).to.have.been.calledOnce;
            expect(client1.getListings).to.have.been.calledWith('billy', sinon.match.func);
            expect(err).to.not.exist;
            watch.close();
            done();
          });
        });

        describe("with watch", function(){
          var watchFn;
          var watch;

          beforeEach(function(){
            mockableObject.reset(polling);
            watch = hakken.watch('billy', { tier: '1', tear: function(obj) { return obj.tear === '1'; } });

            sinon.stub(polling, 'repeat');
            watch.start();

            expect(polling.repeat).have.been.calledOnce;
            expect(polling.repeat).have.been.calledWith('service-watch-billy', sinon.match.func, defaultHeartbeat);

            watchFn = polling.repeat.getCall(0).args[1];

            expect(watch.get()).is.empty;

            mockableObject.reset(polling);
          });

          it("only checks one coordinator for watch", function(done){
            var listings = [{service: 'billy', host: 'billyHost', tier: '1', tear: '1'}];
            sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
            watchFn(function(err){
              expect(err).to.not.exist;
              expect(client1.getListings).have.been.calledOnce;
              expect(client1.getListings).have.been.calledWith('billy', sinon.match.func);
              expect(watch.get()).deep.equals(listings);
              done();
            });
          });

          it("filters listings based on the filter it was given", function(done){
            var listings = [
              {service: 'billy', host: 'billyHost', tier: '1', tear: '1'},
              {service: 'billy', host: 'billyHost2', tier: '1', tear: '2'},
              {service: 'billy', host: 'billyHost3', tier: '2', tear: '1'}
            ];
            sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
            watchFn(function(err){
              expect(err).to.not.exist;
              expect(client1.getListings).have.been.calledOnce;
              expect(client1.getListings).have.been.calledWith('billy', sinon.match.func);
              expect(watch.get()).deep.equals([listings[0]]);
              done();
            });
          });

          it("falls back to other coordinators on coordinator failure", function(done){
            var listings = [{service: 'billy', host: 'billyHost', tier: '1', tear: '1'}];
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
            var listings = [{service: 'billy', host: 'billyHost', tier: '1', tear: '1'}];
            sinon.stub(client1, 'getListings').callsArgWith(1, null, listings);
            watchFn(function(err){
              expect(err).to.not.exist;
              expect(client1.getListings).have.been.calledOnce;
              expect(client1.getListings).have.been.calledWith('billy', sinon.match.func);
              expect(watch.get()).deep.equals(listings);

              client1.getListings.callsArgWith(1, { message: 'I failed you' });

              watchFn(function(err){
                expect(err).to.not.exist;
                expect(watch.get()).deep.equals(listings);
                done();
              });
            });
          });
        });
      });
    });

  });
});
