var assert = require('assert');
var httpMocks = require('node-mocks-http');
var nock = require('nock');
var path = require('path');
var rimraf = require('rimraf');
var testUtils = require('./test-utils')();
var proxy = require('../modules/mock-proxy')();
var cacher = require('../modules/response-cacher')();
var docRoot = __dirname;

var mappings = 
	{
        'mocks': {
			'dir': 'mocks',
			'host': 'http://www.example.com'            
        },
		'mock-proxy-temp': {
			'dir': 'mock-proxy-temp',
			'host': 'http://www.anotherexample.com'
		}        
    };
proxy.init(docRoot, mappings);
cacher.init(docRoot, mappings);

describe('mock-proxy', function() {

    describe('#execute()', function() {

        var test = function(url, done, options) {
            _test(false, url, done, options);
        };

        var testCached = function(url, done, options) {
            _test(true, url, done, options);
        };

        var _test = function(cached, url, done, options) {
            options = options || {};
            var apiKey = cached ? 'mocks' : 'mock-proxy-temp';                        
            var req = testUtils.mockRequest(apiKey, url, options);            
            var res = httpMocks.createResponse({encoding: 'utf8'});
            var body = {msg: 'hello world'};   
            
            var mapping = mappings[apiKey];
            
            // intercept calls to the fictional API and return an OK response
            nock(mapping.host)
                .get(url)                
                .reply(200, body)
                .post(url)
                .reply(200, body)
                .put(url)
                .reply(200, body)
                .delete(url)
                .reply(200, body);

            proxy.execute(req, res).then(
                function() {
                    var conf = testUtils.conf(apiKey, mapping),
                        data = JSON.parse(cacher.get(conf, req));

                    // verify content type and data
                    assert.equal(res.statusCode, data.code);
                    assert.equal(res._getData(), data.body);

                    // check headers
                    var resHeaders = JSON.stringify(res._getHeaders());
                    var dataHeaders = JSON.stringify(data.headers);
                    assert.equal(resHeaders, dataHeaders);

                    done();
                },
                function(err) { throw err; }
            );
        };
        
        after(function(done) {
            rimraf(path.resolve(docRoot, 'mock-proxy-temp'), function(err) {
                if (err) throw err;
                done();
            });
        });

        it('should be able to submit a plain GET request and save its response', function(done) {			
            test('/hello', done);
		});

        it('should be able to load a cached response of a plain GET request', function(done) {			
            testCached('/hello', done);
		});
        
        it('should be able to submit a GET request with a nested path and save its response', function(done) {			
            test('/greeting/hello', done);
		});
        
        it('should be able to load a cached response of a GET request with a nested path', function(done) {			
            testCached('/greeting/hello', done);
		});
        
        it('should be able to submit a GET request with a query string and save its response', function(done) {			
            test('/hello?a=b', done);
		});

        it('should be able to load a cached response of a GET request with a query string', function(done) {			
            testCached('/hello?a=b', done);
		});
                
        it('should be able to submit a GET request with a longer query string and save its response', function(done) {
            test('/hello?a=b&c=d', done);
		});

        it('should be able to load a cached response of a GET request with a longer query string', function(done) {
            testCached('/hello?a=b&c=d', done);
		});
        
        it('should be able to submit a RESTful GET request and save its response', function(done) {
            test('/hello/a/b/c/d', done);
		});

        it('should be able to load a cached response of a RESTful GET request', function(done) {
            testCached('/hello/a/b/c/d', done);
		});
        
        it('should be able to submit a plain GET request using a custom header and save its response', function(done) {
            test('/hello', done, {headers: {'Authorization': 12345}});
		});

        it('should be able to load a cached response of a plain GET request using a custom header', function(done) {
            testCached('/hello', done, {headers: {'Authorization': 12345}});
		});
        
        it('should be able to submit a plain GET request using custom headers and save its response', function(done) {
            test('/hello', done, {
                headers: {'Authorization': 12345, 'Access-Control-Allow-Origin': 'http://www.example.com'}});
		});

        it('should be able to load a cached response of a plain GET request using custom headers', function(done) {
            testCached('/hello', done, {
                headers: {'Authorization': 12345, 'Access-Control-Allow-Origin': 'http://www.example.com'}});
		});
        
        it('should be able to submit a GET request with a query string and using a custom header and save its response',    
        function(done) {
            test('/hello?a=b', done, {headers: {'Authorization': 12345}});
		});

        it('should be able to load a cached response of a GET request with a query string and using a custom header',    
        function(done) {
            testCached('/hello?a=b', done, {headers: {'Authorization': 12345}});
		});
        
        it('should be able to submit a RESTful GET request using a custom header and save its response', function(done) {
            test('/hello/a/b/c/d', done, {headers: {'Authorization': 12345}});
		});

        it('should be able to load a cached response of a RESTful GET request using a custom header', function(done) {
            testCached('/hello/a/b/c/d', done, {headers: {'Authorization': 12345}});
		});
        
        it('should be able to submit a url-encoded POST request and save its response', function(done) {
            test('/hello', done, {method:'POST', body: {a: 'b', c: 'd'}});
		});

        it('should be able to load a cached response of a url-encoded POST request', function(done) {
            testCached('/hello', done, {method:'POST', body: {a: 'b', c: 'd'}});
		});
        
        it('should be able to submit a url-encoded POST request using a custom header and save its response', 
        function(done) {
            test('/hello', done, {method:'POST', body: {a: 'b', c: 'd'}, headers: {'Authorization': 12345}});
		});

        it('should be able to load a cached response of a url-encoded POST request using a custom header', 
        function(done) {
            testCached('/hello', done, {method:'POST', body: {a: 'b', c: 'd'}, headers: {'Authorization': 12345}});
		});
        
        it('should be able to submit a url-encoded POST request using custom headers and save its response', 
        function(done) {
            test('/hello', done, {method:'POST', body: {a: 'b', c: 'd'}, 
                headers: {'Authorization': 12345, 'Access-Control-Allow-Origin': 'http://www.example.com'}});
		});

        it('should be able to load a cached response of a url-encoded POST request using custom headers', 
        function(done) {
            testCached('/hello', done, {method:'POST', body: {a: 'b', c: 'd'}, 
                headers: {'Authorization': 12345, 'Access-Control-Allow-Origin': 'http://www.example.com'}});
		});
        
        it('should be able to submit a PUT request and save its response', function(done) {
            test('/hello', done, {method:'PUT', body: {a: 'b', c: 'd'}});
		});

        it('should be able to load a cached response of a PUT request', function(done) {
            testCached('/hello', done, {method:'PUT', body: {a: 'b', c: 'd'}});
		});
        
        it('should be able to submit a DELETE request and save its response', function(done) {
            test('/hello/a/b/c/d', done, {method:'DELETE'});
		});

        it('should be able to load a cached response of a DELETE request', function(done) {
            testCached('/hello/a/b/c/d', done, {method:'DELETE'});
		});
        
    });
});