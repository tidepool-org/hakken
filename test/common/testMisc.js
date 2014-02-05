/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
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