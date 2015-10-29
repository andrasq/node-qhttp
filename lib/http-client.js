/**
 * very basic http client, originally written for the restiq unit tests
 * Sort of like restify jsonClient or request, but much simpler.
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var http = require('http');
var https = require('https');
var Url = require('url');

module.exports = HttpClient;

function HttpClient( options ) {
    this._options = { url: "", headers: {} };
    for (var i in options) this._options[i] = options[i];
    this._request = this._options.request || http.request;
    this._srequest = this._options.srequest || this._options.request || https.request;
    if (options.auth && typeof options.auth == 'object') {
        var user = options.auth.user || options.auth.username;
        var pass = options.auth.pass || options.auth.password;
        var auth = new Buffer(user + ":" + pass).toString('base64');
        this._options.headers['Authorization'] = "Basic " + auth;
    }
};

HttpClient.emulateRestifyClient = emulateRestifyClient;

// package factory method, require('qhttp/http-client').defaults()
module.exports.defaults = function defaults( opts ) { return new HttpClient(opts) };

HttpClient.prototype = {

    _options: null,
    _request: null,
    _srequest: null,

    call:
    function call( method, uri, body, cb ) {
        if (cb === undefined) { cb = body; body = ""; }
        if (typeof cb !== 'function') throw new Error("callback is required");
        var options = this._buildRequestOptions(method, uri);
        var destroyed = false;

        body = this._encodeBody(options.headers, body);
        options.headers['Content-Length'] = body.length;
        // TODO: test how auth: 'username:password' is passed in the request (if at all)
        // TODO: or whether should add Authorization: Basic header for it ourselves

        var request = options.protocol === 'https:' ? this._srequest : this._request;

        var req = request(options, function(res) {
            if (options.returnBody !== undefined && !options.returnBody) return cb(null, res);

            var chunks = new Array();
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });
            res.on('error', function(err) {
                if (!destroyed) cb(err);
            });
            res.on('end', function() {
                res.body = chunks.length === 1 ? chunks[0] : !chunks.length ? new Buffer("") : Buffer.concat(chunks);
                // TODO: decode body using passed-in decodeBody function
                if (!destroyed) cb(null, res, body);
            });
        });
        req.on('error', function(err) {
            destroyed = true;
            return cb(err);
        });
        // note: a non-empty body stalls 5 sec on Debian 8 with node v0.10 and v0.8.
        // Debian 7, and node 0.11, 0.12 and 4.1.1 do not stall.
        // With Content-Length set, all are fast.
        req.end(body);
        return req;
    },

    _buildRequestOptions:
    function _buildRequestOptions( method, uri ) {
        var i, options = {};
        if (typeof uri === 'string') uri = Url.parse((!uri || uri[0] === '/') ? this._options.url + uri : uri);
        else if (uri && uri.url) uri = this._arrayMerge(uri, Url.parse(uri.url[0] === '/' ? this._options.url + uri.url : uri.url));
        for (i in this._options) options[i] = this._options[i];
        // TODO: copy out just the parts of interest, not all fields from uri
        for (i in uri) options[i] = uri[i];
        options.method = method;
        return options;
    },

    _encodeBody:
    function _encodeBody( headers, body ) {
        if (!body || typeof body === 'string') { headers['Content-Type'] = 'text/plain'; return body; }
        else if (Buffer.isBuffer(body)) {        headers['Content-Type'] = 'application/octet-stream'; return body; }
        else {                                   headers['Content-Type'] = 'application/json'; return JSON.stringify(body); }
    },

    emulateRestify:
    function emulateRestifyClient( ) {
        return emulateRestify(this);
    },
};


function emulateRestifyClient( self ) {
    // load emulate-restify on demand
    require('./emulate-restify.js')(self);
    return;
}
