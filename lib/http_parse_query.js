/**
 * Parse a PHP query string back into a hash.  PHP query strings support
 * hierarchical parameters, eg a[i][j]=1 becomes params.a = {i: {j: 1}};
 * (Note that we parse a[0] into a = {'0': 1} and not a = [1].)
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

module.exports = http_parse_query;
module.exports.urldecode = urldecode;


function http_parse_query( str, params ) {
    var i, j, namevals = str.split('&');
    var params = params || {};

    var len = namevals.length;
    for (i=0; i<len; i++) {
        var nameval = namevals[i];
        if (nameval === '') continue;
        var eq = nameval.indexOf('=');
        if (eq < 0) {
            // generic "set" no specific value, set to 1
            var name = urldecode(nameval);
            set_param_value(params, name, 1);
        }
        else {
            var name = urldecode(nameval.slice(0, eq));
            var value = urldecode(nameval.slice(eq+1));

            if (name.indexOf("[") >= 0) {
                // gather php-style a[a]=1&a[b]=2 into hash {a:1,b:2}
                // a=1&a[k]=2 will ovewrite a=1 with a={k:2}
                if (typeof params[name] !== 'object') params[name] = {};
                var match = name.match(/^([^[]*)\[(.*)\]$/);
                if (!match) throw new Error(name + ": bad query parameter name");
                name = match[1];
                var index = match[2];

                if (typeof params[name] !== 'object') params[name] = {};
                hash = params[name];
                var indexes = match[2].split('][');
                // handle n[a][b][c]=1 as meaning n={a:{b:{c:1}}}
                while (indexes.length > 1) {
                    var idx = indexes.shift();
                    if (typeof hash[idx] !== 'object') hash[idx] = {};
                    hash = hash[idx];
                }
                hash[indexes[0]] = value;
            }
            else set_param_value(params, name, value);
        }
    }
    return params;
}

function decodeURI( str ) {
    try { return decodeURIComponent(str); }
    catch (err) { return str; }
}

function urldecode( str ) {
    var i, len = str.length;
    // if no '%' (0x25) or '+' (0x2b) in the string, then ok as-is
    for (i=0; i<len; i++) {
        var ch = str.charCodeAt(i);
        if (ch === 0x25 || ch === 0x2b) return decodeURI(str);
    }
    return str;
}

function set_param_value( params, name, value ) {
    if (params[name] !== undefined) {
        if (!Array.isArray(params[name])) params[name] = [ params[name] ];
        params[name].push(value);
    }
    else {
        params[name] = value;
    }
}

/**

Todo:

- limit max num parameters (to protect against malicious requests) (1000)
- limit max array depth (to protect against malicious requests) (5)
- parse a[]=1&a[]=2 as a=[1,2] (push items).  Php works this way.
- speedup: gather name with a plain loop, not indexOf + regexp 

**/
