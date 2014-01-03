var fix = require('./fixture.js');

var expect = fix.expect;

function addFn(object, name) {
  object[name] = function() {
    console.log(new Error().stack);
    expect(name).equals("was called when it should not have been");
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
}