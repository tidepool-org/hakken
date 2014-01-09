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

var log = require('../log.js')('polling.js');
var util = require('util');

/**
 * Runs function fn immediately and repeats it after delay millis.
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
function repeat(name, fn, delay, unreference) {
  fn(function(err){
    if (err == null) {
      var future = setTimeout(function(){
        repeat(name, fn, delay, unreference);
      }, delay);
      // Unit tests screw up if the setTimeout is unref'd, so have flag for it.
      if (unreference == null || unreference === true) {
        future.unref();
      }
    }
    else {
      if (err !== 'stop') {
        log.info("%s stopping because of error[%s]", name, util.inspect(err));
      }
    }
  });  
};

exports.repeat = repeat;