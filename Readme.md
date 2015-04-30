qhttp
=====


A few useful http utilities for making web requests.

Included

- `http_build_query` - convert parameter hashes to query strings
- `http_parse_query` - convert query strings to parameter hashes
- `HttpClient` - simple little web request caller

        npm install qhttp
        npm test qhttp


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


### new HttpClient( options )

web request runner, built on top of `http.request`

Options

- `url` - base url to call.  A call to a bare path `/rest/path` will be appended to the base url
- `headers` - headers to pass to each request.  Additional headers may be passed each call
- `request` - http request function.  Default is `http.request`
- `srequest` - https request function.  Default is `https.request`

The options are passed to `request()`, so in addition to the above HttpClient
options, `request` options are also allowed.

Notable request options:

- `agent` - the http agent to use with `request`.  Default is `http.globalAgent`
  See also
  [agentkeepalive](https://www.npmjs.com/package/agentkeepalive) and
  [qhttp-agent](https://www.npmjs.com/package/qhttp-agent).

### httpClient.call( method, uri, [body], callback(err, res) )

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

        HttpClient = require('qhttp/http-client');
        httpClient = new HttpClient();
        httpClient.call('GET', "http://www.google.com", function(err, res) {
            // res.statusCode is HTTP response status code
            // res.body is the HTTP response body, in a Buffer
        });

### HttpClient.emulateRestifyClient( client )

Modify the `client` HttpClient object for improved `restify` compatbility.  New
methods are added, error reporting changes, and the response message is
decoded into an object.

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

- [querystringparser](https://www.npmjs.com/package/querystringparser) - like qs, but much faster
- [fast-url-parser](https://www.npmjs.com/package/fast-url-parser) - like url.parse, but 2x faster
- [cookieparser](https://www.npmjs.com/package/cookieparser)
- [agentkeepalive](https://www.npmjs.com/package/agentkeepalive - like httpAgent, but much faster
- [qhttp-agent](https://www.npmjs.com/package/qhttp-agent) - much faster httpAgent work-alike


## Todo

- maybe have httpClient support streaming responses
- `a[]=1&a[]=2` should be parsed into an array `[1, 2]` like in php
- add emulateRestifyClient as an instance method on httpClient objects
