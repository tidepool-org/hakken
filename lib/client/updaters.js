/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 * 
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

var _ = require('lodash');

var misc = require('../common/misc.js');
var pre = require('amoeba').pre;

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