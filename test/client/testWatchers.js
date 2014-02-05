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

describe('updaters.js', function(){
  describe('random', function(){
    var updaters = require('../../lib/client/updaters.js');
    var array = [1, 2, 3, 4, 5];

    var updater = updaters.list();
    updater.update(array);

    it('should randomly choose a single element', function(){
      var results = updaters.wrappers.random(updater).get();
      expect(results).length(1);
      expect(array).to.include.members(results);
    });

    it('should randomly choose numToPull elements', function(){
      var results = updaters.wrappers.random(updater, 3).get();
      expect(results).length(3);
      expect(array).to.include.members(results);
    });

    it('should randomly choose numToPull elements, all of them!', function(){
      var results = updaters.wrappers.random(updater, array.length).get();
      expect(results).length(array.length).and.include.members(results);
    });

    it('should randomly choose numToPull elements, too many of them!', function(){
      var results = updaters.wrappers.random(updater, 49082138497).get();
      expect(results).length(array.length).and.include.members(results);
    });
  });
});









