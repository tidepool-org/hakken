var fixture = require('../fixture.js');

var expect = fixture.expect;

describe('polling.js', function(){
  it("should repeat", function(done){
    var polling = require('../../lib/common/polling.js');

    var count = 0;
    polling.repeat(
      "test",
      function(cb){
        if (count === 0) {
          count = 1;
          cb();
        }
        else if (count === 1) {
          count = 2;
          cb();
        }
        else if (count === 2) {
          cb('stop');
          done();
        }
      },
      1,
      false
    );
  })
});