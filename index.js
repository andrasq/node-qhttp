// export the singleton from http-client
module.exports = require('./http-client.js');

// utility functions
module.exports.http_build_query = require('./http_build_query.js');
module.exports.http_parse_query = require('./http_parse_query.js');
// and http_parse_query.urldecode
module.exports.parseUrl = require('./parse-url.js');
module.exports.emulateRestifyClient = require('./http-client').emulateRestifyClient;

// and the HttpClient class
module.exports.HttpClient = require('./http-client.js');
