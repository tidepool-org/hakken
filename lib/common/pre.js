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

var util = require('util');

var except = require('./except.js');

exports.notNull = function(val, message) 
{
  if (val == null) {
    throw except.IAE.apply(null, [message].concat(Array.prototype.slice.call(arguments, 2)));
  }
  return val;
};

exports.hasProperty = function(obj, property, message)
{
  if (obj == null) {
    throw except.IAE('Supposed to check for property[%s] on obj, but obj[%s] no exist!', property, obj);
  }
  if (obj[property] == null) {
    if (message == null) {
      message = util.format('property[%s] must be specified on object[%j]', property, obj);
    }
    throw except.IAE.apply(null, [message].concat(Array.prototype.slice.call(arguments, 3)));
  }
  return obj[property];
};

exports.defaultProperty = function(obj, property, val)
{
  if (obj == null) {
    obj = {};
  }
  if (obj[property] == null) {
    obj[property] = val;
  }
  return obj;
};