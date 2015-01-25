var request = require('request');
var timeout = require('config').Timeout;
var cacher = require('./response-cacher')();
var appUtils = require('./app-utils')();
var Q = require('q');

module.exports = function() {
	
	return {
        _mappings: {},
        
		init: function(docRoot, mappings) {	
            this._mappings = mappings;
			cacher.init(docRoot);
		},
		execute: function(req, res) {
            var deferred = Q.defer(),
                conf = this._conf(req);
            
			// There is a cached response
			if (this._loadCached(conf, req, res)) {
                deferred.resolve();
                return deferred.promise;
            }
                        
			var handler = function(err, retRes, body) {
                if (!err && /^2\d\d$/.test(retRes.statusCode)) {
                    var data = {
                        code: retRes.statusCode,
                        headers: retRes.headers,
                        body: body
                    };

                    var me = this;
                    cacher.set(conf, req, data).then(
                        function() {
                            me._success(res, data);
                            deferred.resolve();
                        },
                        function(err) {
                            me._error(res, err);
                            deferred.reject(err);
                        }
                    );

                } else {
                    this._error(res, err);
                    deferred.reject(err);
                }
			};
            
            var hostUrl = conf.host + appUtils.stripApiKey(conf.key, req.url),
                method, urlConf;

            switch (req.method) {
                case 'GET':
                case 'DELETE':
                    urlConf = {url: hostUrl, timeout: timeout};
                    method = (req.method === 'GET') ? request : request.del;
                    break;
                case 'POST':
                case 'PUT':
                    urlConf = {url: hostUrl, form: req.body, timeout: timeout};
                    method = (req.method === 'POST') ? request.post : request.put;
                    break;
                default:
                    deferred.reject(new Error('Invalid HTTP method: ' + req.method));
            }
            if (method) method(urlConf, handler.bind(this));
            return deferred.promise;
		},
		_conf: function(req) {               
            
            // remove a leading slash if there is any
            var reqUrl = req.url.startsWith('/') ? req.url.replace('/','') : req.url;   
            
			for (var key in this._mappings) {                
                var host = this._mappings[key].host;
				if (this._equals(reqUrl, key) || this._equals(reqUrl, host)) {                    
                    var mapping = this._mappings[key];
					return {key: key, dir: mapping.dir, host: mapping.host, skipHeaders: mapping.skipHeaders};
				}
			}
			throw new Error('No configuration found!');
		},   
        _equals: function(value, key) {
            return value.substring(0, key.length) === key;
        },        
		_loadCached: function(conf, req, res) {
			var cached = false,
                data = cacher.get(conf, req);
			
			if (data) {
				this._success(res, JSON.parse(data));
				cached = true;
			}
			return cached;
		},
		_success: function(res, options) {
            res.writeHead(options.code || 200, options.headers);
            res.write(options.body);
            res.end();
        },
        _error: function(res, err) {
            console.error('request failed: ' + err);
            res.writeHead(500, {"Content-Type": 'text/plain'});
            res.write('An error has occured, please review the logs.');
            res.end();
        }
	};
};
