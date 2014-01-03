var except = require('./lib/common/except.js');

exports.fromEnvironment = function(name, default) {
  var retVal = process.env[name];
  if (retVal == null) {
    if (default === undefined) {
      throw except.ISE('Must specify environment variable[%s]', name);
    }
    return default;
  }
  return retVal;
};