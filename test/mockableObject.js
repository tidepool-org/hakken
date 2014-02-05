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

var fix = require('./fixture.js');

var expect = fix.expect;

function addFn(object, name) {
  object[name] = function() {
    throw new Error(name + " was called, but it wasn't mocked");
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
};