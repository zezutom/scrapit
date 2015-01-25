var assert = require('assert');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var testUtils = require('./test-utils')();
var cacher = require('../modules/response-cacher')();
var docRoot = __dirname;
var mappings = 
	{
        'mocks': {
			'dir': 'mocks',
			'host': 'http://www.example.com'            
        },
		'response-cacher-temp': {
			'dir': 'response-cacher-temp',
			'host': 'http://www.anotherexample.com'
		},
		'response-cacher-temp-skip-headers': {
			'dir': 'response-cacher-temp-skip-headers',
			'host': 'http://www.anotherexample.com',
            'skipHeaders': true
		}                
    };
cacher.init(docRoot, mappings);

var readMock = function(dir, filename, method) {    
	var mockPath = path.resolve(docRoot, dir, method || 'GET', filename + '.mock'); 
	return fs.readFileSync(mockPath, 'utf8');
};

var rmDir = function(dir, done) {
    rimraf(path.resolve(docRoot, dir), function(err) {
        if (err) throw err;
        done();
    });                    
};

describe('response-cacher', function() {

    var test = function(url, filename, options) {
        options = options || {};
        
        var apiKey = 'mocks';
        var mapping = mappings[apiKey];
        var req = testUtils.mockRequest(apiKey, url, options);      
        var expected = readMock(mapping.dir, filename, options.method);
        var actual = cacher.get(testUtils.conf(apiKey, mapping), req);

        assert.equal(expected, actual);    
    };
    
	describe('#get()', function() {

		it('should return a saved response of a plain GET request', function() {			
            test('/hello', 'hello');            
		});
        
        it('should return a saved response of a plain GET request with a nested path', function() {
            test('/greeting/hello', 'greeting__hello');
        });
        
		it('should return a saved response of a GET request with a query string', function() {
			test('/hello?a=b', 'hello--a=b');            
        });

		it('should return a saved response of a GET request with a longer query string', function() {
            test('/hello?a=b&c=d', 'hello--a=b&c=d');
        });
        
		it('should return a saved response of a RESTful GET request', function() {
            test('/hello/a/b/c/d', 'hello__a__b__c__d');            
        });
		
        it ('should return a saved response of a GET request without a path using a query string only', function() {
            test('?a=b&c=d', 'a=b&c=d');               
        });
                
        it('should return a saved response of a plain GET request using a custom header', function() {
			test('/hello', path.join('Authorization__12345', 'hello'), {headers: {'Authorization': 12345}});
        });
        
        it('should return a saved response of a plain GET request using custom headers', function() {
            test('/hello', 
                 path.join('Authorization__12345', 
                           'Access-Control-Allow-Origin__http~~____www.example.com', 'hello'), 
                {headers: {
                        'Authorization': 12345,
                        'Access-Control-Allow-Origin': 'http://www.example.com'}
                });
        });
        
		it('should return a saved response of a GET request with a query string and using a custom header', function() {
			test('/hello?a=b', 
                 path.join('Authorization__12345', 'hello--a=b'), {headers: {'Authorization': 12345}});        
        });
		
        it('should return a saved response of a RESTful GET request and using a custom header', function() {
            test('/hello/a/b/c/d',
                 path.join('Authorization__12345', 'hello__a__b__c__d'), {headers: {'Authorization': 12345}});
        });
		                
        it('should return a saved response of a url-encoded POST request', function() {
            test('/hello', 'hello--a=b&c=d', {method:'POST', body: {a: 'b', c: 'd'}});                    
        });
        
        it ('should return a saved response of a POST request without a path using a query string only', function() {
            test('', 'a=b&c=d', {method:'POST', body: {a: 'b', c: 'd'}});               
        });
                
		it('should return a saved response of a url-encoded POST request using a custom header', function() {
            test('/hello', 'hello--a=b&c=d', 
                 {
                    method: 'POST',
                    body: {a: 'b', c: 'd'}, 
                    headers: {'Authorization': 12345}
                });            
        });
		
        it('should return a saved response of a url-encoded POST request using custom headers', function() {
            test('/hello', 
                 path.join(
                    'Authorization__12345', 
                    'Access-Control-Allow-Origin__http~~____www.example.com',
                    'hello--a=b&c=d'), 
                 {
                    method: 'POST',
                    body: {a: 'b', c: 'd'}, 
                    headers: {
                        'Authorization': 12345,
                        'Access-Control-Allow-Origin': 'http://www.example.com'
                    }
                });
        });
        
        it('should return a saved response of a PUT request', function() {
            test('/hello', 'hello--a=b&c=d', {method: 'PUT', body: {a: 'b', c: 'd'}});        
        });
        
        it('should return a saved response of a DELETE request', function() {
            test('/hello', 'hello--a=b&c=d', {method: 'DELETE', body: {a: 'b', c: 'd'}});            
        });        
	});
    
    describe('#set()', function() {

        var test = function(url, done, options) {
            
            var apiKey = 'response-cacher-temp';
            
			var req = testUtils.mockRequest(apiKey, url, options);            
            
            var data = {
                code: 200,
                headers: {'content-type':'application/json'}, 
                body: {'msg':'hello world'}                    
            };
            
            var conf = testUtils.conf(apiKey, mappings[apiKey]);

            cacher.set(conf, req, data).then(
                function() {
                    assert.equal(JSON.stringify(data), cacher.get(conf, req));
                    done();
                },
                function(err) {
                    throw err;
                }
            );
        };
                
        after(function(done) {
            rmDir('response-cacher-temp', done);
        });
        
        it ('should save a response of a plain GET request', function(done) {
            test('/hello', done);               
        });

        it ('should save a response of a plain GET request with a nested path', function(done) {
            test('/greeting/hello', done);               
        });                
        
        it ('should save a response of a GET request with a query string', function(done) {
            test('/hello?a=b', done);               
        });

        it ('should save a response of a GET request with a longer query string', function(done) {
            test('/hello?a=b&c=d', done);               
        });

        it ('should save a response of a RESTful GET request', function(done) {
            test('/hello/a/b/c/d', done);               
        });
        
        it ('should save a response of a plain GET request using a custom header', function(done) {
            test('/hello', done, {headers: {'Authorization': 12345}});               
        });

        it ('should save a response of a plain GET request using custom headers', function(done) {
            test('/hello', done, 
                {
                    headers: {
                        'Authorization': 12345,
                        'Access-Control-Allow-Origin': 'http://www.example.com'
                    }
                });               
        });
        
        it ('should save a response of a GET request with a query string and using a custom header', function(done) {
            test('/hello?a=b', done, {headers: {'Authorization': 12345}});               
        });

        it ('should save a response of a RESTful GET request and using a custom header', function(done) {
            test('/hello/a/b/c/d', done, {headers: {'Authorization': 12345}});               
        });

        it ('should save a response of a GET request without a path using a query string only', function(done) {
            test('?a=b&c=d', done);               
        });
        
        it ('should save a response of a url-encoded POST request', function(done) {             
            test('/hello', done, {method: 'POST', body: {a: 'b', c: 'd'}}); 
        });

        it ('should save a response of a POST request without a path using a query string only', function(done) {
            test('', done, {method: 'POST', body: {a: 'b', c: 'd'}});               
        });
                
        it ('should save a response of a url-encoded POST request using a custom header', function(done) {             
            test('/hello', done, {method: 'POST', body: {a: 'b', c: 'd'}, headers: {'Authorization': 12345}}); 
        });

        it ('should save a response of a url-encoded POST request using custom headers', function(done) {               
            test('/hello', done, {method: 'POST', body: {a: 'b', c: 'd'}, 
                headers: {
                        'Authorization': 12345,
                        'Access-Control-Allow-Origin': 'http://www.example.com'
                }
            }); 
        });
        
        it ('should save a response of a PUT request', function(done) {             
            test('/hello', done, {method: 'PUT', body: {a: 'b', c: 'd'}}); 
        });

        it ('should save a response of a DELETE request', function(done) {             
            test('/hello', done, {method: 'DELETE', body: {a: 'b', c: 'd'}}); 
        });   
                    
    });
    
    describe('#set() // skip headers', function() {
        
        after(function(done) {
            rmDir('response-cacher-temp-skip-headers', done);
        });        
        
        it ('should not create directories based on headers if skipHeaders is enabled', function(done) {
			
            var apiKey = 'response-cacher-temp-skip-headers';
            
            var mapping = mappings[apiKey];
            
            var req = testUtils.mockRequest(apiKey, '/hello');            
            
            var data = {
                code: 200,
                headers: {'content-type':'application/json'}, 
                body: {'msg':'hello world'}                    
            };

            cacher.set(testUtils.conf(apiKey, mapping), req, data)
                .then(
                    function() {
                        assert.equal(JSON.stringify(data), readMock(mapping.dir, 'hello'));
                        done();
                    },
                    function(err) { throw err; }
                );
        });    
    });
});