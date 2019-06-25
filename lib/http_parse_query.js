/**
 * Parse a PHP query string back into a hash.  PHP query strings support
 * hierarchical parameters, eg a[i][j]=1 becomes params.a = {i: {j: 1}};
 * (Note that we parse a[0] into a = {'0': 1} and not a = [1].)
 *
 * Copyright (C) 2015-2016,2019 Andras Radics
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
        if (eq <= 0) {
            if (eq < 0) {
                // generic "set" no specific value, set to 1
                var name = urldecode(nameval);
                if (params[name] === undefined) params[name] = 1;
                else set_field(params, urldecode(nameval), 1);
            }
            // else if name is empty, do not store the value
        }
        else if (nameval.charCodeAt(eq-1) !== 0x5d) {
            // nameval[eq-1] !== "]", plain n=1
            var name = urldecode(nameval.slice(0, eq));
            value = urldecode(nameval.slice(eq+1));
            if (params[name] === undefined) params[name] = value;
            else set_field(params, name, value);
        }
        else {
            // subscripted n[a][b]=1 nameval
            // TODO: speed up single-subscripted n[a]=1 nameval
            // FIXME: allow name to contain encoded [ and ], urldecode piecewise
            var name = urldecode(nameval.slice(0, eq));
            var value = urldecode(nameval.slice(eq+1));
            set_param_value(params, name, value);
        }
    }
    return params;
}

function set_field( params, name, value ) {
    if (params[name] === undefined) params[name] = value;
    else if (Array.isArray(params[name])) params[name].push(value);
    else params[name] = [params[name], value];
}

function set_param_value( params, name, value ) {
    var subscriptOffset;
    if ((subscriptOffset = name.indexOf("[")) >= 0) {
        // gather php-style a[a]=1&a[b]=2 into hash {a:1,b:2}
        // a=1&a[k]=2 will ovewrite a=1 with a={k:2}
        // subscripted name must be ended by ']' 0x5d
        if (subscriptOffset === 0 || name.charCodeAt(name.length-1) !== 0x5d) throw new Error(name + ": bad query parameter name");
        var subscripts = name.slice(subscriptOffset+1, -1);
        name = name.slice(0, subscriptOffset);

        // TODO: speed up subscripted param handling
        // currently 30% faster to not look for nested subscripts x[a][b]

        // TODO: if max subscript is numeric, set params.length to the max subscript
        // (works because alpha is > numeric, but breaks if eg [0a < 1])

        if (typeof params[name] !== 'object') params[name] = {};
        hash = params[name];
        var idx, next;
        if (!subscripts) {
            // subscript is [], gather values into an array
            if (!Array.isArray(hash)) params[name] = hash = new Array();
        }
        else while ((next = subscripts.indexOf('][')) >= 0) {
            idx = subscripts.slice(0, next);
            subscripts = subscripts.slice(next+2);
            if (typeof hash[idx] === 'object') hash = hash[idx];
            else hash = hash[idx] = {};
        }
        if (!subscripts && Array.isArray(hash)) {
            hash.push(value);
        }
        else {
            hash[subscripts] = value;
        }
    }
    else {
        if (params[name] !== undefined) {
            // gather up a=1&a=2 into a = [1, 2]
            if (!Array.isArray(params[name])) { var a = new Array(); a.push(params[name]); params[name] = a; }
            params[name].push(value);
        }
        else {
            params[name] = value;
        }
    }
    return params;
}

function decodeURI( str ) {
    try { return decodeURIComponent(str); }
    catch (err) { return str; }
}

// urldecode() like php, including '+'
function urldecode( str ) {
    // if no '%' (0x25) or '+' (0x2b) in the string, then ok as-is
    if (! /[+%]/.test(str)) return str;

    if (str.indexOf('+') >= 0) str = str.replace(/[+]/g, ' ');
    if (str.indexOf('%') >= 0) str = decodeURIComponent(str);
    return str;
}

/**

Todo:

- limit max num parameters (to protect against malicious requests) (1000)
- limit max array depth (to protect against malicious requests) (5)
- parse a[]=1&a[]=2 as a=[1,2] (push items).  Php works this way.
- speedup: gather name with a plain loop, not indexOf + regexp 

**/
