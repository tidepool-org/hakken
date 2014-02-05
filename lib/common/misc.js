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

exports.randomize = function(array, numElements)
{
  if (numElements == null || numElements > array.length) {
    numElements = array.length;
  }

  var retVal = [];
  var visited = [];

  var randBounds = array.length - 1;
  var i, j;
  for (i = 0; i < numElements; ++i) {
    var randomIndex = _.random(randBounds);

    for (j = 0; j < visited.length; ++j) {
      if (visited[j] <= randomIndex) {
        ++randomIndex;
      }
      else {
        break;
      }
    }

    visited.splice(j, 0, randomIndex);
    retVal.push(array[randomIndex]);
    --randBounds;
  }
  return retVal;
};