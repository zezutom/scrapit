var request = require('request');
var timeout = require('config').Timeout;
var cacher = require('./response-cacher')();
var appUtils = require('./app-utils')();

module.exports = function() {
	
	return {
        _mappings: {},
        
		init: function(docRoot, mappings) {	
            this._mappings = mappings;
			cacher.init(docRoot);
		},
		execute: function(req, res, callback) { 
            var conf = this._conf(req);
            
			// There is a cached response
			if (this._loadCached(conf, req, res)) {
                if (callback) callback();
                return;
            }
                        
			var handler = function(err, retRes, body) {
				this._handleResponse(err, retRes, body, 
                    {conf: conf, res: res, req: req, callback: callback});                
			};
            
            var hostUrl = conf.host + appUtils.stripApiKey(conf.key, req.url);
           
            var urlConf = {url: hostUrl, timeout: timeout};            
            var formConf = {url: hostUrl, form: req.body, timeout: timeout};
            
			switch (req.method) {
				case 'GET':
					request(urlConf, handler.bind(this));
					break;
				case 'POST':    
					request.post(formConf, handler.bind(this));
					break;
				case 'PUT':
					request.put(formConf, handler.bind(this));
					break;
				case 'DELETE':
					request.del(urlConf, handler.bind(this));
					break;
			}
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
			throw new Error("No configuration found!");
		},   
        _equals: function(value, key) {
            return value.substring(0, key.length) === key;
        },        
		_loadCached: function(conf, req, res) {
			var cached = false;
			var data = cacher.get(conf, req);
			
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
        },		
		_handleResponse: function(err, res, body, options) {        
            if (!options) throw new Error("Invalid argument: options must be provided!");

			if (!err && /^2\d\d$/.test(res.statusCode)) {                
                var data = {
                    code: res.statusCode,
                    headers: res.headers, 
                    body: body                    
                };
				cacher.set(options.conf, options.req, data, options.callback);
				this._success(options.res, data);
			} else {
				this._error(options.res, err);
			}
		}
	};	
};
