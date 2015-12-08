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
var parseUrl = require('./parse-url.js');       // 20x faster than url.parse

function HttpClient( options ) {
    options = options || {};
    this._options = { url: "", request: http.request, srequest: https.request, returnBody: undefined, parseUrl: parseUrl };
    this._httpOptions = { method: null, headers: {}, auth: undefined, setNoDelay: undefined };

    // separate the HttpClient options from the http options
    this._httpOptions = this._arrayAdd(this._httpOptions, options);
    this._httpOptions = this._arraySubtract(this._httpOptions, this._options);  // http.request options
    this._options = this._arrayAdd(this._options, options);
    this._options = this._arraySubtract(this._options, this._httpOptions);      // HttpClient options

    if (options.auth && typeof options.auth == 'object') {
        var user = options.auth.user || options.auth.username;
        var pass = options.auth.pass || options.auth.password;
        this._httpOptions.headers['Authorization'] = "Basic " + new Buffer(user + ":" + pass).toString('base64');
        this._httpOptions.auth = undefined;
    }
};

HttpClient.prototype = {

    _options: null,
    _httpOptions: null,

    call:
    function call( method, uri, body, cb ) {
        if (cb === undefined) { cb = body; body = ""; }
        if (typeof cb !== 'function') throw new Error("callback is required");

        if (!body && uri && uri.body) body = uri.body;
        var options = this._buildRequestOptions(method, uri);
        var destroyed = false;

        body = this._encodeBody(options.headers, body);
        options.headers['Content-Length'] = (typeof body === 'string') ? Buffer.byteLength(body) : body.length;

        var request = options.protocol === 'https:' ? this._options.srequest : this._options.request;

        var req = request(options, function(res) {
            if (options.returnBody !== undefined && !options.returnBody) return destroyed ? null : cb(null, res);

            var chunks = new Array();
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });
            res.on('error', function(err) {
                if (!destroyed) cb(err);
            });
            res.on('end', function() {
                var body = res.body = chunks.length === 1 ? chunks[0] : !chunks.length ? new Buffer("") : Buffer.concat(chunks);
                // TODO: decode body using passed-in decodeResponse function (in the get/post etc helpers)
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
        var options = this._arrayAdd({}, this._httpOptions);
        var headers = options.headers;
        if (uri.headers) headers = this._arrayAdd(headers, uri.headers);
        options = this._arrayAdd(options, (typeof uri !== 'object') ? this._parseUrl(uri) : uri);
        if (options.url) options = this._arrayAdd(options, this._parseUrl(options.url));
        options.headers = headers;
        options.method = method;
        return options;
    },

    _encodeBody:
    function _encodeBody( headers, body ) {
        // automatically serialize the body according to its type
        var type;
        if (typeof body === 'string')   { type = 'text/plain'; }
        else if (Buffer.isBuffer(body)) { type = 'application/octet-stream'; }
        else                            { type = 'application/json'; body = JSON.stringify(body); }
        if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = type;
        return body;
    },

    emulateRestify:
    function emulateRestifyClient( ) {
        return emulateRestify(this);
    },

    _parseUrl:
    function _parseUrl( url ) {
        // if url is just a path, prepend the pre-configured http://hostname
        url = (!url || url[0] === '/') ? (this._options.url + url) : url;
        return this._options.parseUrl(url);
    },

    // superficial request compat:
    get: function get( url, body, cb ) { return this.call('GET', url, body, cb) },
    post: function post( url, body, cb ) { return this.call('POST', url, body, cb) },
    put: function put( url, body, cb ) { return this.call('PUT', url, body, cb) },
    del: function del( url, body, cb ) { return this.call('DELETE', url, body, cb) },
    delete: function delete_( url, body, cb ) { return this.call('DELETE', url, body, cb) },

    _arrayAdd:
    function _arrayAdd( a, b ) {
        for (var i in b) if (b[i] !== undefined && b[i] !== null) a[i] = b[i];
        return a;
    },

    _arraySubtract:
    function _arraySubtract( a, b ) {
        var ret = {};
        for (var i in a) if (b[i] === undefined) ret[i] = a[i];
        return ret;
    },
};


function emulateRestifyClient( self ) {
    // load emulate-restify on demand
    require('./emulate-restify.js')(self);
    return;
}

HttpClient.emulateRestifyClient = emulateRestifyClient;

module.exports = HttpClient;

// factory method to construct HttpClient objects, qrequest = require('qhttp/http-client').create()
module.exports.create = function defaults( opts ) { return new HttpClient(opts) };
module.exports.defaults = module.exports.create;

// package methods, eg req = require('qhttp/http-client'); req.get()
var singleton = new HttpClient();
module.exports.call = function(method, url, body, cb) { return singleton.call(method, url, body, cb) };
module.exports.get = function(url, body, cb) { return singleton.get(url, body, cb) };
module.exports.post = function(url, body, cb) { return singleton.post(url, body, cb) };
module.exports.put = function(url, body, cb) { return singleton.put(url, body, cb) };
module.exports.delete = function(url, body, cb) { return singleton.delete(url, body, cb) };
