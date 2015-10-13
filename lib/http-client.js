/**
 * very basic http client, originally written for the restiq unit tests
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var http = require('http');
var https = require('https');
var Url = require('url');

module.exports = HttpClient;
module.exports.emulateRestifyClient = emulateRestifyClient;

function HttpClient( options ) {
    this._options = { url: "", headers: {} };
    for (var i in options) this._options[i] = options[i];
    this._request = this._options.request || http.request;
    this._srequest = this._options.srequest || this._options.request || https.request;
};

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

        var request = options.protocol === 'https' ? this._srequest : this._request;

        var req = request(options, function(res) {
            var chunks = new Array();
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });
            res.on('error', function(err) {
                if (!destroyed) cb(err);
            });
            res.on('end', function() {
                res.body = chunks.length === 1 ? chunks[0] : !chunks.length ? new Buffer("") : Buffer.concat(chunks);
                if (!destroyed) cb(null, res);
            });
        });
        req.on('error', function(err) {
            destroyed = true;
            return cb(err);
        });
        req.end(body);
        return req;
    },

    _buildRequestOptions:
    function _buildRequestOptions( method, uri ) {
        var i, options = {};
        if (typeof uri === 'string') uri = Url.parse((!uri || uri[0] === '/') ? this._options.url + uri : uri);
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
};


function emulateRestifyClient( self ) {
    self.basicAuth =
        function basicAuth( user, pass ) {
            this._options.headers['Authorization'] = "Basic " + new Buffer(user + ":" + pass).toString('base64');
        },

    self.get =
        function get( uri, body, cb ) { return this._callRestifyCompatible('GET', uri, body, cb); };

    self.post =
        function post( uri, body, cb ) { return this._callRestifyCompatible('POST', uri, body, cb); };

    self.put =
        function put( uri, body, cb ) { return this._callRestifyCompatible('PUT', uri, body, cb); };

    self.delete =
        function delete_( uri, body, cb ) { return this._callRestifyCompatible('DELETE', uri, body, cb); };

    self.del =
        self.delete;

    self._callRestifyCompatible =
        function _callRestifyCompatible( method, uri, body, cb ) {
            if (cb === undefined) { cb = body; body = {}; }
            var self = this;
            var req = this.call(method, uri, body, function(err, res) {
                var obj = self._decodeBody(res);
                if (!err && res.statusCode >= 400) {
                    // restify hoists error responses into the err obj, mimic that
                    if (obj && obj.error && obj.error.message) {
                        err = new Error(obj.error.message);
                        if (obj.error.code !== undefined) err.code = obj.error.code;
                        //if (obj.error.stack) err.debug = obj.error.stack;
                    }
                    else if (obj && obj.message) {
                        err = new Error(obj.message);
                        if (obj.code !== undefined) err.code = obj.code;
                    }
                    else err = new Error(http.STATUS_CODES[res.statusCode]);
                }
                else if (obj === undefined) err = new Error("unable to decode response body");
                cb(err, req, res, obj);
            });
            return req;
        };

    self._decodeBody =
        function _decodeBody( res ) {
            function jsonParse(s) {
                try { return JSON.parse(s); } catch (e) { return undefined };
            }
            // TODO: decode based on content-type
            // TODO: allow user to override the built-in decode logic
            var body = res.body, first = body[0], last = body[body.length-1];
            if (first === '{' && last === '}') return jsonParse(body.toString());
            else if (first === '[' && last === ']') return new Buffer(jsonParse(body.toString())); 
            else return body;
        };

    function hashToStruct(o) {
        // assigning it to a function prototype converts a hash into a struct
        var f = function() {};
        f.prototype = o;
        // add a try/catch block to disable optimization of this function
        try { return f; } catch (e) { }
    }
    //hashToStruct(self);
}
