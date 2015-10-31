/**
 * emulate restify httpClient, jsonClient etc on top of httpClient
 * The emulation is not perfect, but basic code should work.
 *
 * Copyright (C) 2015 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict'

var util = require('util')
var http = require('http')
var HttpClient = require('./http-client.js')

module.exports = emulateRestifyClient

function emulateRestifyClient(httpClient) {
    // hack: re-parent httpClient inheritance to EmulateRestifyClient to get the extra methods
    httpClient.__proto__ = EmulatedRestifyClient.prototype
    return httpClient
}

function EmulatedRestifyClient( httpClient ) {
    throw new Error("do not instantiate")
}
util.inherits(EmulatedRestifyClient, HttpClient);


EmulatedRestifyClient.prototype.basicAuth =
    function basicAuth( user, pass ) {
        this._options.headers['Authorization'] = "Basic " + new Buffer(user + ":" + pass).toString('base64');
    },

EmulatedRestifyClient.prototype.get =
    function get( uri, body, cb ) { return this._callRestifyCompatible('GET', uri, body, cb); };

EmulatedRestifyClient.prototype.post =
    function post( uri, body, cb ) { return this._callRestifyCompatible('POST', uri, body, cb); };

EmulatedRestifyClient.prototype.put =
    function put( uri, body, cb ) { return this._callRestifyCompatible('PUT', uri, body, cb); };

EmulatedRestifyClient.prototype.delete =
    function delete_( uri, body, cb ) { return this._callRestifyCompatible('DELETE', uri, body, cb); };

EmulatedRestifyClient.prototype.del =
    EmulatedRestifyClient.prototype.delete;

EmulatedRestifyClient.prototype._callRestifyCompatible =
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

EmulatedRestifyClient.prototype._decodeBody =
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

// assigning to a prototype converts the assigned the object from a hash to a struct
EmulatedRestifyClient.prototype = EmulatedRestifyClient.prototype
