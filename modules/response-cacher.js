var fs = require('fs');
var filendir = require('filendir')
var appUtils = require('./app-utils')();
var Q = require('q');

module.exports = function() {
    
	return {
        _docRoot: undefined,
        
		init: function(docRoot) {
			this._docRoot = appUtils.getAbsPath(docRoot);
		},
		get: function(conf, req) {            
			return this._readMock(this._resolveMockPath(conf, req));	
		},
		set: function(conf, req, options) {
            if (!options) throw new Error("Invalid argument: options must be provided!");
            var deferred = Q.defer(),
                mockPath = this._resolveMockPath(conf, req);
            filendir.wa(mockPath, JSON.stringify(options), function(err) {
                if (err) deferred.reject(err);
                else deferred.resolve();
            });
            return deferred.promise;
		},
        _resolveMockPath: function(conf, req) {
			            
            // Mock data directory associated with the API call
			var path = appUtils.getDataDir(conf, req);            
			if (!path) return null;

			// Custom headers
            if (!conf.skipHeaders) {
                var headers = appUtils.getReqHeaders(req);
                if (headers) path = appUtils.bind(path, headers);            
            }

			// Meta info regarding the request's url, including the query string
			var parts = appUtils.getUrlParts(appUtils.stripApiKey(conf.key, req.url));

			if (parts) {
				// REST parameters
				var urlPath = appUtils.getUrlPath(parts);
				if (urlPath) path = appUtils.bind(path, urlPath);

				// Query string
                var qs = appUtils.getQueryString(urlPath, parts, req);
				if (qs) path = (urlPath) ? path += qs : appUtils.bind(path, qs);				
			}
          
            return appUtils.bind(this._docRoot, path + '.mock');
        },
		_readMock: function(mockPath) {            
			return (fs.existsSync(mockPath)) ? fs.readFileSync(mockPath, 'utf8') : '';            
		}
	};
};