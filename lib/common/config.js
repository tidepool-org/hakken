/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
 */

var except = require('./except.js');

exports.fromEnvironment = function(name, defaultVal) {
  var retVal = process.env[name];
  if (retVal == null) {
    if (defaultVal === undefined) {
      throw except.ISE('Must specify environment variable[%s]', name);
    }
    return defaultVal;
  }
  return retVal;
};