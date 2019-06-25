/**
 * Copyright (C) 2015,2019 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var http_parse_query = require('../http_parse_query');

module.exports = {
    'should export via index': function(t) {
        var indexjs = require('../index');
        t.equal(http_parse_query, indexjs.http_parse_query);
        t.done();
    },

    'should export urldecode': function(t) {
        t.equal('function', typeof http_parse_query.urldecode);
        t.done();
    },

    'should decode flat params': function(t) {
        var str = "a=1&b=two&c=";
        var params = http_parse_query(str);
        t.equal('1', params.a);
        t.equal('two', params.b);
        t.equal('', params.c);
        t.done();
    },

    'should decode repeated params into array': function(t) {
        var str = "a=1&b=11&b=22&a=2";
        var params = http_parse_query(str);
        t.deepEqual(params.a, [1, 2]);
        t.deepEqual(params.b, [11, 22]);
        t.done();
    },

    'should decode blank params into arrays': function(t) {
        var str = "a&b&a&b";
        var params = http_parse_query(str);
        t.deepEqual(params.a, [1, 1]);
        t.deepEqual(params.b, [1, 1]);
        t.done();
    },

    'should decode blank field names into arrays': function(t) {
        var str = "a[]=1&a[]=2";
        var params = http_parse_query(str);
        t.deepEqual(params.a, [1, 2]);
        t.done();
    },

    'should decode hierarchical params into object': function(t) {
        var str = "a[i][j][0]=1&a[i][j][1]=2";
        var params = http_parse_query(str);
        t.deepEqual(params.a, {i: {j: {'0': 1, '1': 2}}});
        t.done();
    },

    'decode speed 10k 3 flat params': function(t) {
        var i, str = "a=1&b=2&c=3", params;
        for (i=0; i<10000; i++) params = http_parse_query(str);
        // 550k/s
        t.done();
    },

    'decode speed 10k 3 hierarchical params': function(t) {
        var i, str = "a[i]=1&aq[j]=2&a[k]=3", params;
        for (i=0; i<10000; i++) params = http_parse_query(str);
        // 360k/s
        t.done();
    },

    'should not extract params out of an empty string': function(t) {
        var params = http_parse_query("");
        t.deepEqual(params, {});
        t.done();
    },

    'should not extract params out of gaps': function(t) {
        var params = http_parse_query("a=1&&b=2&");
        t.deepEqual(params, {a:1, b:2});
        t.done();
    },

    'should decode + as space': function(t) {
        var params = http_parse_query("a=1&&b=2+3+4");
        t.deepEqual(params, {a:1, b:'2 3 4'});
        t.done();
    },

    'urldecode': {
        'should parse + into space': function(t) {
            t.equal(http_parse_query.urldecode("a+b+c&d"), "a b c&d");
            t.done();
        },

        'should parse all %-encoded ascii chars': function(t) {
            var encoded = '', plain = '';
            // note: decodeURI* reject 8-bit chars, non-ascii chars must be encoded in multi-byte utf8 form
            for (var i=0; i<128; i++) {
                plain += String.fromCharCode(i);
                encoded += '%' + pad2(i.toString(16));
            }
            t.equal(http_parse_query.urldecode(encoded), plain);
            t.done();
        },
    },
};

function pad2( n ) {
    return n.length < 2 ? '0' + n : n;
}
