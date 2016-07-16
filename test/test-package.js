module.exports = {
    'should parse package.json': function(t) {
        t.expect(1);
        var json = require('../package.json');
        t.ok(json.name);
        t.done();
    },

    'should export expected targets': function(t) {
        var main = require('../');
        t.equal(typeof main.parseUrl, 'function');
        t.equal(typeof main.http_build_query, 'function');
        t.equal(typeof main.http_parse_query, 'function');
        t.equal(typeof main.emulateRestifyClient, 'function');
        t.equal(typeof main.HttpClient, 'function');
        t.done();
    },
};
