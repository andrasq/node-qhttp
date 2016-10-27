/**
 * Copyright (C) 2015-2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var http_build_query = require('../http_build_query');

function buildObject( name, value ) {
    var obj = {};
    obj[name] = value;
    return obj;
}

module.exports = {
    'should export by name and aggregate': function(t) {
        var h1 = require('../http_build_query');
        var h2 = require('../index').http_build_query;
        t.equal(h1, h2);
        t.done();
    },

    'should use eq_sign option': function(t) {
        t.equal("a:1&b:2", http_build_query({a:1, b:2}, {eq_sign: ':'}));
        t.done();
    },

    'should use arg_seprator option': function(t) {
        t.equal("a=1//b=2", http_build_query({a:1, b:2}, {arg_separator: '//'}));
        t.done();
    },

    'should use numeric_prefix option': function(t) {
        var str = http_build_query([1,2], {numeric_prefix: 'x'});
        t.equal(str, "x0=1&x1=2");
        t.done();
    },

    'should encode space as + by default, per application/x-www-form-urlencoded': function(t) {
        t.equal("a=a+b", http_build_query({a: "a b"}));
        t.equal("a=a+b", http_build_query({a: "a b"}, {encoding: 'PHP_QUERY_RFC1738'}));
        t.done();
    },

    'rfc3986 should encode spaces as %20 for rfc3986': function(t) {
        t.equal("a=a%20b", http_build_query({a: "a b"}, {encoding: 'PHP_QUERY_RFC3986'}));
        t.done();
    },

    'should not encode -_.~': function(t) {
        t.equal("a=-_.~", http_build_query({a: "-_.~"}));
        t.equal("a=-_.~", http_build_query({a: "-_.~"}, {encoding: 'PHP_QUERY_RFC1738'}));
        t.equal("a=-_.~", http_build_query({a: "-_.~"}, {encoding: 'PHP_QUERY_RFC3986'}));
        t.done();
    },

    'should use leave_brackets option': function(t) {
        var str1 = http_build_query({a:[1,2]});
        var str2 = http_build_query({a:[1,2]}, {leave_brackets: true});
        t.equal(str1, "a%5B0%5D=1&a%5B1%5D=2");
        t.equal(str2, "a[0]=1&a[1]=2");
        t.equal(str2, str1.replace(/%5B/g, "[").replace(/%5D/g, "]"));
        t.done();
    },

    'should build query from object': function(t) {
        t.equal("a=1&b=2", http_build_query({a:1, b:2}));
        t.done();
    },

    'should build query from array': function(t) {
        t.equal("0=1&1=2", http_build_query([1, 2]));
        t.done();
    },

    'should build query from nested objects': function(t) {
        t.equal("a=1&b[ba]=2&b[bb]=3&b[bc][d]=1", http_build_query({a:1, b:{ba:2, bb:3, bc:{d:1}}}, {leave_brackets: 1}));
        t.done();
    },

    'should omit null value like php (also undefined)': function(t) {
        t.equal("", http_build_query({a: null}));
        t.equal("", http_build_query({a: undefined}));
        t.done();
    },

    'should typeset booleans as 0 or 1': function(t) {
        t.equal('a=0', http_build_query({a: false}));
        t.equal('a=1', http_build_query({a: true}));
        t.done();
    },

    'should output only defined array elements': function(t) {
        var x = [0,1,2,4];
        delete(x[0]);
        delete(x[3]);
        t.equal("x1=1&x2=2", http_build_query(x, {numeric_prefix: 'x'}));
        t.done();
    },

    'should build expected query string from input': function(t) {
        var i, expect = {
            'a=1&b=2': {a:1, b:2},
            'a[a]=1&a[b]=2': {a: {a:1, b:2}},
            'a[0][a]=1&a[0][b]=2&a[1]=3': {a: [{a:1, b:2}, 3]},
        };
        for (i in expect) {
            var str = http_build_query(expect[i], {leave_brackets: true});
            t.equal(str, i, "expected " + i + ", but got " + str);
        }
        t.done();
    },

    'should build query string from Buffer': function(t) {
        var buf = new Buffer("test data");
        var str = http_build_query({a: buf});
        t.equal(str, "a=test+data");
        t.done();
    },

    'should build query string from Date': function(t) {
        var dt = new Date(0);
        var str = http_build_query({a: dt});
        t.ok(str.length > 20);
        t.done();
    },
};
