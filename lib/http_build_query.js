/**
 * Built a GET or POST query string like the PHP http_build_query()
 *
 * Copyright (C) 2014,2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

module.exports = http_build_query;
module.exports.PHP_QUERY_RFC1738 = 'PHP_QUERY_RFC1738';
module.exports.PHP_QUERY_RFC3986 = 'PHP_QUERY_RFC3986';

/**
 * urlencode() keys and values, and build a key=value&key2=value2&... string
 *
 * @param params        object or array with keys and values
 * @param [options]     options object
 *
 * Options:
 *      arg_separator   '&'
 *      eq_sign         '='
 *      numeric_prefix  string to prepend to numeric keys
 *      encoding        PHP_QUERY_RFC3986 or PHP_QUERY_RFC1738 (default)
 *      leave_brackets  encode {a:[3]} as "a[0]=3" and not "a%5B0%5D=3"
 */
function http_build_query( params, options ) {
    'use strict';

    options = options || {};
    var sepchar = options.arg_separator || '&';
    var eq = options.eq_sign || '=';
    var num_prefix = options.numeric_prefix || '';
    var isArray = Array.isArray(params);

    var string = "";
    var i, j, k;

    var keys = new Array();
    if (isArray) for (i=0; i<params.length; i++) keys[i] = i;
    else keys = Object.keys(params);

    for (k=0; k<keys.length; k++) {
        i = keys[k];

        // TODO: inherited properties are also valid and should not be skipped
        if (!params.hasOwnProperty(i)) continue;

        // php omits fields that are null
        if (params[i] === undefined || params[i] === null) continue;

        switch (typetest(params[i])) {
        case '[object Date]':
            string += rawurlencode((num_prefix && isArray) ? num_prefix + i : i) + eq + rawurlencode(params[i].toISOString());
            break;
        case 'scalar':
        case 'Buffer':
        case '[object RegExp]':
            // note: querystring.encode() encodes objects as "" empty string
            if (string) string += sepchar;
            string += (rawurlencode((num_prefix && isArray) ? num_prefix + i : i) + eq + rawurlencode(params[i]));
            break;
        case '[object Array]':
            // note: querystring.encode() encodes flat arrays [1,2,3] as a=1&a=2&a=3, and
            //   nested arrays [1,[2],3] as a=1&a=&a=3.  We encode like php, a[0]=1&a[1]=2&a[2]=3
            // Could test whether the array is flat or contains arrays, and encode two ways,
            // that would also allow recovery of flat arrays as array, instead of hash.
        case '[object Object]':
            var npref = options.numeric_prefix;
            options.numeric_prefix = '';
            var values = {};
            // php seamlessly converts a=[1,2,3] to/from a[0]=1&a[1]=2&a[2]=3
            // TODO: faster if sub-lists were inlinded (much faster if omitted)
            for (j in params[i]) values[i + '[' + j + ']'] = params[i][j];
            if (string) string += sepchar;
            string += http_build_query(values, options);
            options.numeric_prefix = npref;
            break;
        }
    };

    // if not rfc3986, convert '%20' to rfc1738 '+'
    if (!options.encoding || options.encoding === 'PHP_QUERY_RFC1738') {
        // convert rfc3986 to application/x-www-form-urlencoded encoding
        string = string.replace(/%20/g, '+');
    }

    if (options.leave_brackets) {
        string = string.replace(/%5B/g, '[').replace(/%5D/g, ']');
    }

    return string;
}

// rfc3986 urlencode
function rawurlencode( str ) {
    if (str === true) return 1;
    else if (str === false) return 0;
    // php omits field if value is null, must be handled in caller
    else if (str === null || str === undefined) return "";
    else return encodeURIComponent((typeof str === 'string') ? str : str + "");
}

// fast object type test
var scalarTypes = {
    string: true,
    number: true,
    undefined: true,
    boolean: true,
};
function typetest( item ) {
    if (!item) return 'scalar';         // 0, false, "", null, undefined
    if (scalarTypes[typeof item]) return 'scalar';
    if (Buffer.isBuffer(item)) return 'Buffer';
    if (item instanceof Date) return '[object Date]';
    var typestring = Object.prototype.toString.call(item);
    return typestring;
}


// quick test:
/**
querystring = require('querystring');

console.log("AR: arr", http_build_query([false,1,2,3,null,5,true,""], {leave_brackets: true}));
console.log("AR: obj", http_build_query({a:1,b:2,c:3,d:true}, {leave_brackets: true}));
console.log("AR: combo", http_build_query({a:1,b:2,c:[1,2,3]}, {leave_brackets: true}));
console.log("AR: combo 2", http_build_query({a:1,b:2,c:[1,2,3,[4,5,6]]}, {leave_brackets: true}));
console.log("AR: combo 3", http_build_query({a:1,b:2,c:{a:1,b:2,c:3}}, {leave_brackets: true}));

console.log("AR: querystring", querystring.encode({a:1,b:2,c:[1,2,3]}));
console.log("AR: querystring", querystring.encode({a:1,b:2,c:[1,2,3,[4,5,6]]}));
console.log("AR: querystring", querystring.encode({a:1,b:2,c:{a:1,b:2,c:3}}));

timeit = require('./timeit');

timeit(200000, function(){ http_build_query({a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8}); });
// 595k/s for 3, 230k/s for 8
timeit(200000, function(){ querystring.encode({a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8}); });
// 420k/s for 3, 208k/s for 8

timeit(10000, function(){ http_build_query([false,true,2,null,""]) });
// 190k/s... sensitive to number of items!!
timeit(10000, function(){ http_build_query({a:1,b:2,c:3,d:true,e:false}) });
// 220k/s
timeit(10000, function(){ http_build_query({a:1,b:2,c:[1,2,3]}) });
// 82k/s (because it recurses?)
// NOTE: php runs the above at 480k/s, 6.8x faster !!!

timeit(10000, function(){ http_build_query({a:1,b:2,c:[1,2,3,[4,5,6]]}) });
// 38k/s

timeit(10000, function(){ querystring.encode({a:1,b:2,c:3,d:true}, {leave_brackets: true}) });
// 223k/s ??? same

timeit(10000, function(){ querystring.encode({a:1,b:2,c:[1,2,3,[4,5,6]]}) });
// 240k/s much faster -- does NOT encode nested array

timeit(10000, function(){ querystring.encode({a:1,b:2,c:{a:1,b:2,c:3}}) });
// 400k/s -- does NOT encode nested object

/**/
