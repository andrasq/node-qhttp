/**
 * Parse an http url like require('url').parse, but much much faster.
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

module.exports = parseUrl;

var parseUrlRegExp = new RegExp(
    // http://user:pass@host.com/path/name?a=1&#hash
    '^' +
    '([^:/]+:)?' +                          //  1 protocol
    '(//)?' +                               //  2 slashes
    '((([^:@/]*)?(:([^@/]*))?)@)?' +        //  3 auth: usename, password
    '(([^/?#:]*)?(:([0-9]*)?)?)?' +         //  8 host: hostname, port
    '((/[^?#]*)?([?]([^#]*))?)?' +          // 12 pathname: path, search, query
    '(#.*)?' +                              // 16 hashtag
    '$'
);

function parseUrl( url ) {
    // url parsing by regex is 23x faster than url.parse() (10k in 10.5ms vs 250ms)
    var match = url.match(parseUrlRegExp);
    if (!match) return {};

    // node http expects null, not undefined, so change non-matching fields
    for (var i=0; i<match.length; i++) if (match[i] === undefined) match[i] = null;

    var parts = {
        protocol: match[1],
        slashes: match[2] ? true : null,
        auth: match[4],
        username: match[5],
        password: match[7],
        host: match[8],
        port: match[11],
        hostname: match[9],
        hash: match[16],
        search: match[14],
        query: match[15],
        pathname: (match[13] || '/'),
        path: (match[13] || '/') + (match[14] || ''),
        href: (match[1] || '') + (match[2] || '') + (match[3] || '') + (match[8] || '') + (match[13] || '/') + (match[14] || '') + (match[16] || ''),
    };

    // if protocol or slashes are missing, url.parse treats rest of string as all part of pathname
    if (!parts.protocol || !parts.slashes) {
        parts.auth = null;
        parts.username = null;
        parts.password = null;
        parts.host = null;
        parts.port = null;
        parts.hostname = null;
        parts.pathname = (match[2] ? '//' : '') + (match[3] || '') + (match[8] || '') + (match[13] || '');;
        parts.path = (match[2] ? '//' : '') + (match[3] || '') + (match[8] || '') + (match[12] || '');
        parts.href = (parts.protocol || '') + parts.path + (parts.hash || '');
        // if protocol is missing, url.parts leaves slashes as null
        parts.slashes = null;
    }

    return parts;
}
