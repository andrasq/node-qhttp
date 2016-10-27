/**
 * Copyright (C) 2015-2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var net = require('net');
var http = require('http');
var Url = require('url');
var HttpClient = require('../http-client');
var EventEmitter = require('events').EventEmitter;

var qhttp = require('../index');

module.exports = {
    before: function(done) {
        this.request = [];
        this.requestBinary = [];
        this.reply = 'HTTP/1.1 200 OK\r\n\r\n{"reply":"body"}';
        var self = this;
        this.server = net.createServer(function connected(socket) {
            socket.setNoDelay();
            socket.on('data', function(chunk) {
                self.requestBinary[0] = chunk;
                self.request[0] = chunk.toString();
                socket.write(self.reply);
                socket.end();
            });
            socket.on('error', function(err) {
                self.request = (err);
            });
        });
        this.server.listen(1337);
        done();
    },

    after: function(done) {
        this.server.close();
        done();
    },

    setUp: function(done) {
        this.request.length = 0;
        this.client = new HttpClient();
        done();
    },

    'qhttp module': {
        'should export singleton call method': function(t) {
            var self = this;
            qhttp.call('METHOD_HTTP', "http://localhost:1337", function(err) {
                t.ifError(err);
                t.equal(self.request[0].indexOf('METHOD'), 0);
                t.done();
            })
        },

        'should export singleton convenience methods': function(t) {
            var self = this;
            qhttp.post("http://localhost:1337", function(err, res, body) {
                t.ok(self.request[0].indexOf('POST / HTTP') === 0);
                t.equal(body, '{"reply":"body"}');
                t.done();
            });
        },
    },

    'should separate qhttp and http options': function(t) {
        var client = new HttpClient({setNoDelay:'test', request:'test'});
        t.equal(client._options.setNoDelay, undefined);
        t.equal(client._options.request, 'test');
        t.equal(client._httpOptions.setNoDelay, 'test');
        t.equal(client._httpOptions.request, undefined);
        t.done();
    },

    'should generate Authorization header from options.auth': function(t) {
        var client = new HttpClient({ auth: {username: "user", password: "pass"} });
        var self = this;
        client.get("http://localhost:1337?a=1", function(err, res) {
            t.ok(self.request[0].indexOf('Authorization: Basic '+new Buffer("user:pass").toString("base64")) > 0);
            t.done();
        });
    },

    'should merge pre-configured headers with call-time headers': function(t) {
        var client = qhttp.defaults({ auth: {user: "user", pass: "pass" } });
        var self = this;
        client.get({url: "http://localhost:1337", headers: {custom: 'true'}}, function(err, res, body) {
            t.ok(self.request[0].indexOf("Authorization: Basic ") > 0);
            t.ok(self.request[0].indexOf("custom: true\r\n") > 0);
            t.done();
        });
    },

    'should ignore options.auth if it is a string': function(t) {
        var client = new HttpClient({ auth: "user:pass" });
        var self = this;
        client.get("http://user:@localhost:1337?a=1#tag", function(err, res) {
            t.ok(self.request[0].indexOf('Authorization: Basic '+new Buffer("user:pass").toString("base64")) < 0);
            t.done();
        });
    },

    'call should return request': function(t) {
        var req = this.client.call('GET', "http://localhost:1337", function(err, res) { });
        t.ok(req instanceof http.ClientRequest);
        t.done();
    },

    'call should accept url in call options': function(t) {
        var client = new HttpClient({url: "http://localhost:80"});
        this.client.get({url: "http://localhost:1337"}, "body", function(err, res, body) {
            t.equal(body.toString(), '{"reply":"body"}');
            t.done();
        });
    },

    'defaults factory method should construct client': function(t) {
        var client = HttpClient.defaults({});
        t.ok(client instanceof HttpClient);
        t.done();
    },

    'response should include Buffer body': function(t) {
        t.expect(3);
        var req = this.client.call('GET', "http://localhost:1337", function(err, res) {
            t.ifError(err);
            t.ok(res.body);
            t.ok(Buffer.isBuffer(res.body));
            t.done();
        });
    },

    'response should omit body if so requested': function(t) {
        var req = this.client.call('GET', {url: "http://localhost:1337", returnBody: false}, function(err, res, body) {
            t.ifError(err);
            t.equal(res.body, undefined);
            t.equal(body, undefined);
            t.done();
        });
    },

    'should provide shortcuts for get/post etc': function(t) {
        t.ok(typeof this.client.get === 'function');
        t.ok(typeof this.client.post === 'function');
        t.ok(typeof this.client.put === 'function');
        t.ok(typeof this.client.delete === 'function');
        t.done();
    },

    'should make https request': function(t) {
        var self = this;
        this.client.get("https://localhost:1337", function(err, res, body) {
            t.ok(self.request[0]);
            t.ok(self.request[0].indexOf('HTTP') < 0);
            t.done();
        });
    },

    'get should get': function(t) {
        var self = this;
        this.client.get("http://localhost:1337", function(err, res) {
            t.ok(Buffer.isBuffer(res.body));
            t.equal(self.request[0].indexOf("GET / HTTP"), 0);
            t.done();
        });
    },

    'post should post': function(t) {
        var self = this;
        this.client.post("http://localhost:1337", {abc:1234}, function(err, res) {
            t.ok(Buffer.isBuffer(res.body));
            t.equal(self.request[0].indexOf("POST / HTTP"), 0);
            t.ok(self.request[0].indexOf('{"abc":1234}') > 0);
            t.done();
        });
    },

    'post should post binary': function(t) {
        var self = this;
        var body = new Buffer(1024);
        for (var i=0; i<body.length; i++) body[i] = i;
        this.client.post("http://localhost:1337", body, function(err, res) {
            // http headers are 7-bit ascii, index of blank line is same in the Buffer
            var blankLine = self.request[0].indexOf('\r\n\r\n');
            var sent = self.requestBinary[0].slice(blankLine + 4);
            t.deepEqual(sent, body);
            t.done();
        })
    },

    'should post to relative path': function(t) {
        var self = this;
        var client = HttpClient.defaults({url: 'http://localhost:1337'});
        client.post("/", {abc:12345}, function(err, res) {
            t.ok(self.request[0].indexOf('{"abc":12345}') > 0);
            t.done();
        });
    },

    'should take body from uri': function(t) {
        var self = this;
        this.client.post({url: 'http://localhost:1337', body: {abc:1234}}, function(err, res) {
            t.ok(self.request[0].indexOf('{"abc":1234}') > 0);
            t.done();
        });
    },

    'should take body from arguments over uri': function(t) {
        var self = this;
        this.client.post({url: 'http://localhost:1337', body: {abc:1234}}, {abc:12345}, function(err, res) {
            t.ok(self.request[0].indexOf('{"abc":1234}') < 0);
            t.ok(self.request[0].indexOf('{"abc":12345}') > 0);
            t.done();
        });
    },

    'should set correct Content-Length': function(t) {
        var self = this;
        this.client.get("http://localhost:1337", "\x80\xff", function(err) {
            t.ok(self.request[0].indexOf("Content-Length: 4\r\n") > 0);
            self.client.get("http://localhost:1337", {a:"\x80\xff"}, function(err) {
                t.ok(self.request[0].indexOf("Content-Length: 12\r\n") > 0);
                t.done();
            });
        });
    },

    'should return error on connect error': function(t) {
        this.client.call('GET', "http://localhost:1", function(err, res) {
            t.ok(err);
            t.done();
        });
    },

    'should return error on transmission error': function(t) {
        var req = new EventEmitter();
        req.end = function(data) { }
        var res = new EventEmitter();
        setTimeout(function(){ res.emit('error', new Error("oops")); }, 2);
        var client = new HttpClient({request: function(options, cb) { cb(res); return req; }});
        client.call('GET', "http://localhost", function(err, cres) {
            t.ok(err);
            t.equal(err.message, "oops");
            t.done();
        });
    },

    'should assemble response from chunks': function(t) {
        var req = new EventEmitter();
        req.end = function(data) { }
        var res = new EventEmitter();
        setTimeout(function(){ res.emit('data', new Buffer("a")) }, 2);
        setTimeout(function(){ res.emit('data', new Buffer("b")) }, 2);
        setTimeout(function(){ res.emit('data', new Buffer("c")) }, 2);
        setTimeout(function(){ res.emit('end') }, 2);
        var client = new HttpClient({request: function(options, cb) { cb(res); return req; }});
        client.call('GET', "http://localhost", function(err, cres) {
            t.equal(res, cres);
            // WARNING: node-v0.10.29: timeout functions are not always called in timeout order
            // eg with timeouts (1,2,3,3) have seen "bac" and "ac"; with (1,2,3,4) seen "ab"
            // However, order seems to be preserved within the same timeout interval.
            t.equal("abc", res.body.toString());
            t.ok(Buffer.isBuffer(res.body));
            t.done();
        });
    },

    'should reject two-argument form': function(t) {
        var ok = false;
        try { this.client.call("http://localhost:1337", function(err, res) { }); }
        catch (err) { ok = true; }
        t.ok(ok);
        t.done();
    },

    'should require a function callback': function(t) {
        var ok = false;
        try { this.client.call('GET', "http://localhost:1337", "body"); }
        catch (err) { ok = true; }
        t.ok(ok);
        t.done();
    },

    'restify emulation': {
        setUp: function(done) {
            HttpClient.emulateRestifyClient(this.client);
            done();
        },

        'should expose get/post methods': function(t) {
            var methods = ['get', 'post', 'put', 'del'];
            for (var i in methods) t.equal(typeof this.client[methods[i]], 'function');
            t.done();
        },

        'should return err,req,res,obj in callback': function(t) {
            t.expect(3);
            this.client.get("http://localhost:1337", function(err, req, res, obj) {
                t.ok(req instanceof http.ClientRequest);
                t.ok(res instanceof http.IncomingMessage);
                t.ok(obj);
                t.done();
            });
        },

        'should accept uri object': function(t) {
            t.expect(2);
            var uri = {
                url: "/",
                hostname: "localhost",
                port: 80,
            };
            this.client.get(uri, function(err, req, res, obj) {
                t.ifError(err);
                t.ok(res.body.length);
                t.done();
            });
        },
    },

    'parseUrl': function(t) {
        var parseUrl = require('../lib/parse-url.js');
        var data = [
            "http://host.com",
            "http://host/path",
            "http://host/path/name/?query=yes",
            "http://host/path/name#hash",
            "http://host/path/name?query#hash",
            "http://host.com?a=1",
            "http://host.com?a=1?b=2",
            "http://host.com#tag",
            "http://host.com#tag#tag2",
            "https://user:pass@host.com:8080/path/name.php",
            "http://host.com:8080/path/name?p=q",
            "http://host.com?p=q#hashtag",
            "https://host.name.com/path/name/?a=1&b=2&c=%20#tag1#tag2",
            "https://host.name.com/path/name?a=1&b=2&c=%20#tag1#tag2",
            "http://user@host/path",
            "http://host?com",
            "http://host/path",
            "http://host//path",
            "host/path",
            "//host/path",
            "ftp:host:80",
            "ftp:host/path#tag",
            "ftp://host:80#tag",
            "//host/path",
            "/",
            "/path/name?query=1&b=2",
            "/path#tag",
            "/path/name/?query?two#tag#two",
        ];
        var uparts, qparts;
        for (var i=0; i<data.length; i++) {
            uparts = Url.parse(data[i]);
            qparts = parseUrl(data[i]);
            //console.log("AR: u", uparts); console.log("AR: q", qparts);
            for (var j in uparts) if (typeof uparts[j] !== 'function') t.equal(qparts[j], uparts[j]);
        }
        t.done();
    },

    'throughput': {
        'should run 100 calls': function(t) {
            var ncalls = 100;
            var self = this;
            (function loop() {
                if (ncalls-- <= 0) return t.done();
                self.client.get("http://localhost:1337", {a:1}, function(err, res, body) {
                    loop();
                });
            })();
            // 1k: 1800/sec, 10k: 2170/sec (using url.parse: 1640/sec, 1960/sec)
            // request: 1k: 1025/sec
        },

        '10k url.parse': function(t) {
            var url = "http://user:pass@host.com/path/to/file.php?a=1&b=2#tag";
            var parts;
            for (var i=0; i<10000; i++) parts = Url.parse(url);
            // 10k: .24 sec
            t.done();
        },

        '10k client._parseUrl': function(t) {
            var url = "http://user:pass@host.com/path/to/file.php?a=1&b=2#tag";
            var parts;
            for (var i=0; i<10000; i++) parts = this.client._parseUrl(url);
            // 10k: .011 sec
            t.done();
        },

        '10k parseUrl': function(t) {
            var parseUrl = require('../lib/parse-url.js');
            var url = "http://user:pass@host.com/path/to/file.php?a=1&b=2#tag";
            var parts;
            for (var i=0; i<10000; i++) parts = parseUrl(url);
            // 10k: .010 sec
            t.done();
        },
    },
};
