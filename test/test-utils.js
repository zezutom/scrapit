var httpMocks = require('node-mocks-http');

module.exports = function() {

    return {
        mockRequest: function(apiKey, url, options) {
            if (!apiKey) throw new Error("apiKey must be defined");
            options = options || {};
            return httpMocks.createRequest({
                method: options.method || 'GET',
                url: '/' + apiKey + url,
                headers: options.headers || {},
                body: options.body || {}                
            });
        },
        conf: function(key, mapping) {
            return {key: key, dir: mapping.dir, host: mapping.host, skipHeaders: mapping.skipHeaders};   
        }
    };
};