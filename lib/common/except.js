var util = require('util');

function makeExceptionMaker(type)
{
  return function(message) {
    if (arguments.length > 1) {
      message = util.format.apply(null, [message].concat(Array.prototype.slice.call(arguments, 1)));
    }
    return {
      name: type,
      message: message,
      stack: new Error(message).stack
    };
  };
}

exports.IAE = makeExceptionMaker("IllegalArgumentException");
exports.ISE = makeExceptionMaker("IllegalStateException");
exports.RE = makeExceptionMaker("RuntimeException");