module.exports = {
    'should parse package.json': function(t) {
        t.expect(1);
        var json = require('../package.json');
        t.ok(json.name);
        t.done();
    },
};
