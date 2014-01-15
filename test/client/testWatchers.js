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

describe('watchers.js', function(){
  describe('buildWrapper', function(){
    var watchers = require('../../lib/client/watchers.js');

    beforeEach(function(){
      mockableObject.reset(watchers);
    });

    it('builds a random watcher', function(){
      sinon.spy(watchers, 'random');

      var config = {fn: 'random', numToPull: 25};
      expect(watchers.buildWrapper(config)).to.respondTo('wrap');

      expect(watchers.random).to.have.been.calledOnce;
      expect(watchers.random).to.have.been.calledWith(config);
    });

    it('builds a random watcher from an array', function(){
      sinon.spy(watchers, 'random');

      var config = {fn: 'random', numToPull: 25};
      expect(watchers.buildWrapper([config])).to.respondTo('wrap');

      expect(watchers.random).to.have.been.calledOnce;
      expect(watchers.random).to.have.been.calledWith(config);
    });

    it('builds two random watchers from an array', function(){
      sinon.spy(watchers, 'random');

      var config1 = {fn: 'random', numToPull: 25};
      var config2 = {fn: 'random', numToPull: 1};
      expect(watchers.buildWrapper([config2, config1])).to.respondTo('wrap');

      expect(watchers.random).to.have.been.calledTwice;
      expect(watchers.random).to.have.been.calledWith(config1);
      expect(watchers.random).to.have.been.calledWith(config2);
    });

    it('builds a reverse-applied composition of random watchers from an array', function(){
      var config1 = {fn: { wrap: function(watcher){
        return { get: function(){ return [1, 2]; }}
      }}};
      var config2 = {fn: 'random', numToPull: 1};

      var watcher = {
        get: function() { return [1, 2, 3, 4, 5]; }
      };

      var wrapper = watchers.buildWrapper([config1]);
      expect(wrapper.wrap(watcher).get()).deep.equals([1, 2]);

      wrapper = watchers.buildWrapper([config2, config1]);
      expect(wrapper.wrap(watcher).get()).length(1);

      wrapper = watchers.buildWrapper([config1, config2]);
      expect(wrapper.wrap(watcher).get()).deep.equals([1, 2]);
    });

  });

  describe('random', function(){
    var watchers = require('../../lib/client/watchers.js');
    var array = [1, 2, 3, 4, 5];

    var watcher = {
      get: function() {
        return  array;
      }
    };

    it('should have a start and close method', function(){
      var watcher = watchers.buildWrapper({fn: 'random'}).wrap(watcher);
      expect(watcher).to.respondTo('start');
      expect(watcher).to.respondTo('close');
    });

    it('should randomly choose an element', function(){
      var results = watchers.buildWrapper({fn: 'random'}).wrap(watcher).get();
      expect(results).length(1);
      expect(array).to.include.members(array);
    });

    it('should randomly choose numToPull elements', function(){
      var results = watchers.buildWrapper({fn: 'random', numToPull: 3}).wrap(watcher).get();
      expect(results).length(3);
      expect(array).to.include.members(results);
    });

    it('should randomly choose numToPull elements, all of them!', function(){
      var results = watchers.buildWrapper({fn: 'random', numToPull: array.length}).wrap(watcher).get();
      expect(results).length(array.length).and.include.members(results);
    });

    it('should randomly choose numToPull elements, too many of them!', function(){
      var results = watchers.buildWrapper({fn: 'random', numToPull: 49082138497}).wrap(watcher).get();
      expect(results).length(array.length).and.include.members(results);
    });
  });
});









