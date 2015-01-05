var urlModule = require('url');
var querystring = require('querystring');
var path = require('path');

// Utility methods

module.exports = function() {

    if ( typeof String.prototype.startsWith != 'function' ) {
      String.prototype.startsWith = function( str ) {
        return str.length > 0 && this.substring( 0, str.length ) === str;
      }
    };    
    
    return {
        stripApiKey: function(key, url) {
            var key = '/' + key;
            if (url.startsWith(key)) url = url.replace(key, '');
            return url;
        },
        getUrlParts: function(url) {
            return urlModule.parse(url, true);
        },
		getUrlPath: function(urlParts) {
            if (!urlParts.pathname) return '';
			return this.stripSpecialChars(urlParts.pathname.replace('/', ''));
		},
        getQueryString: function(urlPath, urlParts, req) {
            /*
            * How the query string (QS) is obtained depends on HTTP method and URL path. Example:
            *
            * #1 URL path exists - append the QS as part of the file name 
            *   
            *   The leading '?' will be preserved to give a visual aid on how the path looked like.
            *
            *   GET http://localhost:8088/myapi/hello?a=b&c=d
            *   -> myapi/GET/hello--a=b&c=d.mock    
            *
            * #2 No URL path - create a new file out of the QS itself
            *
            *   The leading '?' will be removed in order to keep the filename as short as possible.
            *   GET http://localhost:8088/myapi?a=b&c=d                
            *   -> myapi/GET/a=b&c=d.mock
            *
            * Another factor is GET vs non-GET (POST or PUT in practice). In case we are not dealing
            * with a GET method, the QS will be pulled from request's body. It is assumed that the body
            * is URL-encoded.
            */            
            var qs;
            if ((req.method === 'GET')) {
                qs = urlParts.search || '';
                if (!urlPath && qs.startsWith('?')) qs = qs.replace('?', '');
            } else {
                qs = querystring.stringify(req.body);
                if (qs && urlPath) qs = '?' + qs;
            }        
			return this.stripSpecialChars(qs);			
        },
        getReqHeaders: function(req) {
            var headers = '';
			for (var key in req.headers) {
                headers = this.bind(headers, this.stripSpecialChars(key + '/' + req.headers[key]));
            }
            return headers;        
        },
		stripSpecialChars: function(val) {
			if (!val) return val;
			return val.replace(/\?/g, '--').replace(/\//g, '__').replace(/:/g, '~~');
		},        
        bind: function(a, b) {
            return path.join(a, b);
        },
        getDataDir: function(conf, req) {            
            return this.bind(conf.dir, req.method);       
        },
        getAbsPath: function(dir) {
            return path.resolve(dir);
        }
     };
};