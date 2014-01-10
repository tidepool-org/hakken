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

var misc = require('../common/misc.js');
var pre = require('../common/pre.js');

/**
 * This is a collection of functions used to manipulate hakken watchers.
 *
 * Technically speaking, they can be used to wrap any object with a get() method that returns a list.
 *
 * The expected primary entry-point is via the buildWrapper() function, but all functions are exposed for posterity
 */

/**
 * Returns a wrapper that decorates a watcher such that it will return a random sub-selection of listings.
 *
 * @param config - arguments are passed as properties of this config object.  arguments: numToPull
 * @returns {Function} - the wrapper
 */
exports.random = function(config){
  var numToPull = config.numToPull;
  if (numToPull == null) {
    numToPull = 1;
  }

  return mappingWrapper(function(listings) {
    return misc.randomize(listings, numToPull);
  });
};

/**
 * A function that converts a config into a selector function for use with hakken.
 *
 * The configs form a grammar by which functions are created.  The config is expect to have a
 * "fn" property, which specifies which function to buildWrapper.  For example,
 *
 * { fn: 'random' }
 *
 * Produces a wrapper that will randomly choose a single listing.  Each of these methods is passed
 * in the config object, so arguments to your specific method of choice can be attached to
 * the config.
 *
 * { fn: 'random', numToPull: 3 }
 *
 * Will produce a wrapper that will randomly choose 3 listings and return those.
 *
 * @param config - a config object, or an array of config objects.  If an array,
 * the wrappers will be applied in reverse order (the "rightmost" wrapper will apply first)
 * @returns { wrap: wrap } - an object that can be used to wrap a watcher.
 */
exports.buildWrapper = function(config) {
  if (Array.isArray(config)) {
    var wrappers = [];
    for (var i = 0; i < config.length; ++i) {
      wrappers.push(this.buildWrapper(config[i]));
    }

    return composeWrappers(wrappers);
  }

  var fnName = pre.hasProperty(config, 'fn');
  if (typeof fnName === 'object' && fnName.hasOwnProperty('wrap')) {
    return fnName;
  }

  var builderFn = pre.hasProperty(exports, fnName);
  return  builderFn(config);
};

function mappingWrapper(mapFn) {
  return {
    wrap: function(watcher) {
      return {
        get: function() {
          return mapFn(watcher.get());
        }
      }
    }
  };
}

function composeWrappers(wrappers) {
  return {
    wrap: function (watcher) {
      var retVal = watcher;
      for (var i = wrappers.length - 1; i >= 0; --i) {
        retVal = wrappers[i].wrap(retVal);
      }
      return retVal;
    }
  };
}
