qhttp
=====

Simple, fast, low overhead utility for making http requests.

A convenience wrapper to simplify using `http` but keep the common use cases fast.
Similar to `request`, but without the added complexity and 2x faster making
back-to-back calls.

QHttp auto-detects the request body and encodes it accordingly:  strings as-is as
`text/plain`, Buffers as-is as `application/octet-stream`, all else encoded with
JSON.stringify as `application/json`.  The response is not decoded, it is returned
in a Buffer (or left to the caller; see below).

Included

- `HttpClient` - quick little web request caller
- `parseUrl` - fast http url parser, 18x faster than `url.parse`
- `http_build_query` - convert parameter hashes to query strings
- `http_parse_query` - convert query strings to parameter hashes

        npm install qhttp
        npm test qhttp


## Package

The package exports a pre-constructed qhttp client object with methods get, post,
put and delete, as well as several helper functions.

Exported functions:
- `call`, `get`, `post`, `put`, `delete`: make web requests using the qhttp singleton, see `HttpClient` below
- `create`: HttpClient factory for creating new pre-configured HttpClient objects.  Also available as `defaults`.
- `http_build_query`: construct a query string from parts
- `http_parse_query`: parse a query string into its parts
- `parseUrl`: fast url.parse work-alike for http urls
- `emulateRestifyClient(client)`: decorate client with some `restify` jsonClient methods and semantics

        var qhttp = require('qhttp');
        qhttp.get("http://example.com", function(err, res, body) {
            console.log(body);
        });

## Functions

### http_build_query( objectOrArray, [options] )

format a query string like PHP's [http_build_query](http://php.net/manual/en/function.http-build-query.php).
In particular, it handles nested objects and nested arrays.

        var http_build_query = require('qhttp/http_build_query');
        var params = {a: 1, b: 2, c: [3, 4, [5, 6]]};
        var queryString = http_build_query(params, {leave_brackets: true});
        // => "a=1&b=2&c[0]=3&c[1]=4&c[2][0]=5&c[2][1]=6"

        var params = {d: {a: 1, b: 2, c: {a: 1, b: 2}}};
        var queryString = http_build_query(params, {leave_brackets: true});
        // => "d[a]=1&d[b]=2&d[c][a]=1&d[c][b]=2"

        var params = [1, 2, 3];
        var queryString = http_build_query(params, {numeric_prefix: 'idx'});
        // => "idx0=1&idx1=2&idx2=3"

Options:

- `arg_separator`   - default '&'
- `eq_sign`         - default '='
- `numeric_prefix`  - string to prepend to numeric keys
- `encoding`        - 'PHP_QUERY_RFC1738' (default) encodes spaces as '+',
                    'PHP_QUERY_RFC3986' encodes spaces as '%20'
- `leave_brackets`  - encode `{a:[3]}` as "a[0]=3" and not "a%5B0%5D=3"


### http_parse_query( string )

parse an http query, the counterpart to http_build_query.  Similar to
the php `parse_str()`

build up the parameters hash from the PHP-style query string.  Parses
name-value pairs as expected, `a=1&b=2` is `{a:1, b:2}`.  names value-less
names as if set to one, i.e. `a&b` becomes {a:1, b:1}.  Unlike PHP, gathers
repeated parameters into arrays (e.g., `a=1&a=2` is `{a: [1, 2]}` and not a=2.
Like PHP, parses hierarchical values like `a[i][j]=1` into `{a: {i: {j:1}}}`.

        var http_parse_query = require('qhttp/http_parse_query');
        var params = http_parse_query("a=1&b=2&c[0]=3&c[1]=4&c[2][0]=5");
        // => {a:1, b:2, c:{'0':3, '1':4, '2':{'0':5}}}

Todo: flat numerical hierarchies should be converted to arrays, not objects..
Currently `a[0]=1&a[1]=2` parses a into the object `{'0':1, '1':2}` and not
`[1, 2]`.  This is not symmetric with http_build_query() behavior.


### parseUrl( url )

parse simple URL strings the way `url.parse` does, but 4x faster.
The parsed results are returned in a hash (without the url.parse functions),
and all fields set by url.parse are set to the same values as by url.parse.
The urls should be of the form `(protocol) // (auth) (host) (path) (search) (hash)`
or `(path)(search)(hash)`, eg. `"http://user:pass@example.com:80/path/name?a=1&b=2#tag1"`
- `protocol`: `http:` or `https:` (http:)
- `auth`: `user@` or `user:password@` (user:pass)
- `host`: the non-auth string after the `//` and before the first `/` (example.com:80)
- `path`: the trailing end of the url string, not including the hash (/path/name?a=1&b=2)
- `search`: the portion of the string from the first '?' to the hash (?a=1&b=2)
- `hash`: the portion of the string from the first '#' to the end (#tag1)

In addition to the above fields, url.parse and parseUrl also separate
- `hostname`: host without the port (example.com)
- `port`: host port (80)
- `username`: user part of auth (user) (parseUrl only, not url.parse)
- `password`: password part of auth (pass) (parseUrl only, not url.parse)
- `query`: search without the leading '?' (a=1&b=2)
- `pathname`: path without the search component (/path/name)
- `href`: the normalized url string, from protocol to hash.  This is often
  the same as the input url, but can differ if eg no path was specified
  `"http://host.com?a=1"` => `"http://host.com/?a=1"`.

        var parseUrl = require('qhttp/parse-url');
        var url = "http://usr:pwd@example.com80/path/name?query=yes#tag";
        var parts = parseUrl(url);
        // => { host: 'example.com:80', hostname: 'example.com', port: '80',
        //      auth: 'usr:pwd', hash: '#tag', query: 'query=yes' }

### create( options )

Return a newly constructed HttpClient object preconfigured with the given options.
See `HttpClient` below.  Also available as `defaults(options)` for `request` compatibility.

### get( url, body, callback(err, res, body) )
### post( url, body, callback(err, res, body) )
### put( url, body, callback(err, res, body) )
### delete( url, body, callback(err, res, body) )

Convenience web request calls using the built-in singleton.

### new HttpClient( options )

web request runner, built on top of `http.request`

Options

- `url` - base url to call, eg "http://host.com".  A call to a bare path `/rest/path`
  will be combined with the base url to form "http://host.com/rest/path" for the request.
- `headers` - headers to pass to each request.  Additional headers may be passed at call time
- `request` - http request function.  Default is `http.request`
- `srequest` - https request function.  Default is `https.request`
- `returnBody` - gather up the response body and return it in the callback (default `true`).
  If set to `false`, the web request callbacks will get just the `res` response object, which
  can then be gathered or piped by the caller.
- `auth` - http Basic authorization object containing `username` and `password`
  or authorization string in the form "username:password".  `user` and `pass` are also ok.
- `parseUrl` - function to use for url string parsing.  Default is `require('qhttp/parse-url')`,
  which parses only well-formatted urls in the form `http://user:pass@host:80/path?query#tag`
  but is 4x faster than Url.parse and reduces overall round-trip call latency by 10%.

The options are passed to `request()`, so in addition to the above HttpClient
options, `request` options are also allowed.  Null and undefined values are ignored.

Notable request options:

- `agent` - the http agent to use with `request`.  Default is `http.globalAgent`
  See also
  [agentkeepalive](https://www.npmjs.com/package/agentkeepalive) and
  [qhttp-agent](https://www.npmjs.com/package/qhttp-agent) for faster,
  more predictable connection agents.

### httpClient.call( method, uri, [body], callback(err, res, body) )

make a web request

- `method` - the http method to use, eg GET or POST
- `uri` - the service address to load, either a query string or an `http.request` compatible object
- `body` (optional) - the message to send in the body of the request
- `callback` - function that will be called with the `http.IncomingMessage` response

Returns via the callback the http response, with `res.body` set to a Buffer
containing the raw unparsed reply message.

The `body` may be a string, an object, or a Buffer.  String is sent as
content-type 'text/plain'.  Object is json-encoded and sent as
'application/json'.  Buffer is sent as binary data as type
'application/octet-stream'.

The call always sets `Content-Type` to match the body (unless already set),
and `Content-Length`.

        HttpClient = require('qhttp/http-client');
        httpClient = new HttpClient();
        httpClient.call('GET', "http://www.google.com", function(err, res, body) {
            // res.statusCode is the HTTP response status code
            // body == res.body is the HTTP response body, in a Buffer
        });

### httpClient.get
### httpClient.post
### httpClient.put
### httpClient.delete

Shortcuts to `httpClient.call('GET', ...)` etc., similar to `request`.

        client = require('qhttp/http-client');
        client.get("http://www.google.com", function(err, res, body) {
            console.log(body.toString())
        })

### HttpClient.emulateRestifyClient( client )
### client.emulateRestifyClient( )

Modify the `client` HttpClient object for improved `restify` compatbility.  New
methods are added, error reporting changes, the response message is
decoded into an object, and the get/post etc convenience methods callbacks
are called with different arguments.

The methods added to httpClient are:

#### httpClient.basicAuth( username, password )

Sign requests with an "Authorization: Basic" header out of username:password

#### httpClient.get( uri, body, callback(err, req, res, obj) )

make a GET request

#### httpClient.post( uri, body, callback(err, req, res, obj) )

make a POST request

#### httpClient.put( uri, body, callback(err, req, res, obj) )

make a PUT request

#### httpClient.delete( uri, body, callback(err, req, res, obj) )

make a DELETE request.  For compatbility, can also be called as `del`.


## Related Work

- [qhttp/parseUrl](https://www.npmjs.com/package/qhttp) - like url.parse, but 4x faster
- [querystringparser](https://www.npmjs.com/package/querystringparser) - like qs, but much faster
- [fast-url-parser](https://www.npmjs.com/package/fast-url-parser) - like url.parse, but 2x faster
- [cookieparser](https://www.npmjs.com/package/cookieparser)
- [agentkeepalive](https://www.npmjs.com/package/agentkeepalive) - like httpAgent, but much faster
- [qhttp-agent](https://www.npmjs.com/package/qhttp-agent) - much faster httpAgent work-alike


## ChangeLog

0.6.1
- fix http_parse_query() to decode + into ' ' space

0.6.0
- encode dates as toISOString
- encode only array contents, not array properties

0.5.1

- fix parseUrl export

0.5.0

- fix dev dependency name
- accept the body parameter from the uri object as well

0.4.0

- have the package export a `qhttp` singleton with methods `get`, `post`, etc
- fix Content-Length for multi-byte utf8 characters
- fix header handling to not clobber pre-configured headers at call time
- `create()` factory method (aka `defaults`)
- expose singleton `call` method

0.3.0

- HttpClient:
  - returnBody:false option to not wait for response to arrive
  - auth: options for http basic auth
  - `defaults()` factory method
  - get, post, put, delete shortcuts
  - fix: do not overwrite user-supplied Content-Type
  - fix: do not call callback twice if req error
  - make unit tests standalone (do not hit localhost:80)
  - expose module-level get, post, etc functions eg `require('qhttp/http-client').get(...)`
- new `qhttp/parse-url` function
- switch unit tests from nodeunit to qunit

0.2.2
  - return body as third arg of callback

## Todo

- maybe have httpClient support streaming responses
- `a[]=1&a[]=2` should be parsed into an array `[1, 2]` like in php
- configure HttpClient decodeResponse function
