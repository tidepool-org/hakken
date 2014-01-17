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

var _ = require('lodash');

var misc = require('../common/misc.js');
var pre = require('../common/pre.js');

/**
 * This is a collection of functions used to create and manipulate hakken updaters.
 */

/**
 * An updater that just maintains and provides the current list of items.
 *
 * @param log optional, if provided, this will log when new listings show up and old ones disappear
 * @returns {{update: update, get: get}}
 */
exports.list = function(log) {
  var currListings = [];
  return {
    update: function(listings) {
      var oldListings = currListings;
      currListings = listings;

      if (log != null) {
        var i = 0;
        for (i = 0; i < oldListings.length; ++i) {
          if (! listings.some(_.isEqual.bind(_, oldListings[i]))) {
            log.info('gone is service[%j]', oldListings[i]);
          }
        }
        for (i = 0; i < currListings.length; ++i) {
          if (! oldListings.some(_.isEqual.bind(_, currListings[i]))) {
            log.info('new is listing[%j]', currListings[i]);
          }
        }
      }
    },
    get: function() {
      return currListings;
    }
  }
};

/**
 * A set of wrapper functions that can wrap an updater to provide extra functionality.
 *
 * @type {
 *   random: A wrapper that pics a listing randomly on get
 * }
 */
exports.wrappers = {};

/**
 * Wraps an updater such that it will return a randomize selection of listings
 *
 * @param updater the updater to wrap
 * @param numToPull optional, specifies the number of items to select randomly
 * @returns {Function} the wrapper
 */
exports.wrappers.random = function(updater, numToPull){
  pre.notNull(updater, "Must provide an updater");
  if (numToPull == null) {
    numToPull = 1;
  }

  return {
    update: updater.update.bind(updater),
    get: function() {
      var listings = updater.get.apply(updater, Array.prototype.slice.call(arguments, 0));
      return misc.randomize(listings, numToPull);
    }
  };
};

/**
 * Wraps an updater such that it filters listings passed in to the update() method.
 *
 * Filtering is done such that listings must match the key-value pairs in the provided filter argument
 *
 * @param updater the updater to wrap
 * @param filter the filter to apply
 * @returns a wrapped updater
 */
exports.wrappers.filter = function(updater, filter){
  pre.notNull(updater, "Must provide an updater");
  if (filter == null) {
    filter = {};
  }

  var propertyFilters = Object.keys(filter).map(function(key){
    var val = filter[key];
    if (typeof val === 'function') {
      return val;
    }
    return function(listing) {
      return listing[key] === val;
    }
  });

  var filterFn = function(listing) {
    for (var i = 0; i < propertyFilters.length; ++i) {
      if (! propertyFilters[i](listing)) {
        return false;
      }
    }
    return true;
  };

  return {
    update: function(listings) {
      updater.update(listings.filter(filterFn));
    },
    get: updater.get.bind(updater)
  };
};