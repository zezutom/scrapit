var express = require('express');
var favicon = require('static-favicon');
var path = require('path');
var bodyParser = require('body-parser');
var xmlParser = require('express-xml-bodyparser');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var url = require('url');
var mappings = require('config').Mappings;
var docRoot = require('config').DocRoot || __dirname;

/* Initialization */
var app = express();
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());                 // to support JSON-encoded bodies
app.use(bodyParser.urlencoded());           // to support URL-encoded bodies
app.use(xmlParser({explicitArray: false})); // to support XML
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Mock server initialization
var proxy = require('./modules/mock-proxy')();
proxy.init(docRoot, mappings);

/* Routing */
// GET home page
app.get('/', function(req, res) {
  res.render('index', { title: 'API Mock Server' });
});

// Proxied http methods
var supportedMethods = ['get', 'post', 'put', 'delete'];

for (var key in mappings) {
	var mappedUrl = '/' + key + '*';

    // API calls are delegated to the mock server
    supportedMethods.forEach(function(method) {
        app[method](mappedUrl, function(req, res) {
            proxy.execute(req, res);
        });
    });
}

module.exports = app;