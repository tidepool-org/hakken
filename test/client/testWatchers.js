/*
 * == BSD2 LICENSE ==
 */

/*
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









