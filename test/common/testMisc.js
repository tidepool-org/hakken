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

var misc = require('../../lib/common/misc.js');

describe('misc.js', function(){
  describe('randomize', function(){
    it("returns an empty list if given an empty list", function(){
      var array = [];
      expect(misc.randomize(array, 1)).is.empty;
    });

    it("returns the number of elements asked for", function(){
      var array = [1, 2, 3, 4];
      expect(misc.randomize(array, 1)).length(1);
      expect(misc.randomize(array, 2)).length(2);
      expect(misc.randomize(array, 3)).length(3);
      expect(misc.randomize(array, 4)).length(4);
    });

    it("returns all elements if asked for length", function(){
      var array = [1, 2, 3, 4];
      var retVal = misc.randomize(array, 4);

      expect(retVal).to.include.members(array);
      expect(retVal.sort()).to.deep.equal(array);
    });

    it("returns all elements, once, if asked for more than length", function(){
      var array = [1, 2, 3, 4];
      var retVal = misc.randomize(array, 1902309184);

      expect(retVal).to.include.members(array);
      expect(retVal.sort()).to.deep.equal(array);
    });
  });
});