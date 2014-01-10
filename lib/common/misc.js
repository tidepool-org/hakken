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