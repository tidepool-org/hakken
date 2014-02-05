/*
 * == BSD2 LICENSE ==
 */

/*
 * == BSD2 LICENSE ==
 */

(function() {
  'use strict';

  var config = require('./env.js');
  require('./lib/hakken.js')(config.discovery).server.makeSimple(config.host, config.port).start();
})();
