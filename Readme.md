qhttp
=====


A few useful http utilities for making web requests.

        npm install qhttp
        npm test qhttp


## Functions

### http_build_query( objectOrArray, [options] )

build an http query, [php http_build_query](http://www.php.net/manual/en/function.http_build_query.php) work-alike.

### http_parse_query( string )

parse an http query, the counterpart to http_build_query.  Similar to
the php `parse_str()`

### new HttpClient( )

web request runner, built on top of `http.request`

        HttpClient = require('qhttp').HttpClient;
        httpClient = new HttpClient();
        httpClient.call('GET', "http://www.google.com", function(err, res) {
            // res.statusCode is HTTP response status code
            // res.body is the HTTP response body
        });

### httpClient.call( method, uri, [body], callback(err, res) )

make a web request

- `method` - the http method to use, eg GET or POST
- `uri` - the service address to load, either a query string or an `http.request` compatible object
- `body` (optional) - the message to send in the body of the request
- `callback` - function that will be called with the `http.IncomingMessage` response

The `body` may be a string, an object, or a Buffer.  String is sent as
content-type 'text/plain'.  Object is json-encoded and sent as
'application/json'.  Buffer is sent as binary data as type
'application/octet-stream'.


## Todo

