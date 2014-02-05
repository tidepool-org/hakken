/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
 */

var fix = require('./fixture.js');

var expect = fix.expect;

function addFn(object, name) {
  object[name] = function() {
    throw new Error(name + " was called, but it wasn't mocked");
  };
};

exports.make = function() {
  var retVal = {};
  for (var i = 0; i < arguments.length; ++i) {
    addFn(retVal, arguments[i]);
  }
  return retVal;
};

exports.reset = function() {
  for (var i = 0; i < arguments.length; ++i) {
    var obj = arguments[i];
    for (var fn in obj) {
      if (obj[fn]['restore'] != null) {
        obj[fn].restore();
      }
      expect(obj[fn]['restore']).undefined;
    }
  }
};