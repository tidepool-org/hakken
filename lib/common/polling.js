var log = require('../log.js')('polling.js');
var util = require('util');

/**
 * Runs function fn immedately and repeats it after delay millis.
 *  
 * Function is given a callback.  If the callback is called with an error
 * repetition will cease.  If the error is the String 'stop', then it will
 * do this silently, otherwise it will produce a log line using bunyan. The
 * callback must be called in order to schedule the next repetition.
 *
 * name - cosmetic, used for logging.
 * fn - the function to run
 * delay - delay in millis
 */
function repeat(name, fn, delay) {
  fn(function(err){
    if (err == null) {
      setTimeout(function(){
        repeat(name, fn, delay);
      }, delay).unref();
    }
    else {
      if (err !== 'stop') {
        log.info("%s stopping because of error[%s]", name, util.inspect(err));
      }
    }
  });  
};

exports.repeat = repeat;