# scrapit
[![Build Status](https://travis-ci.org/zezutom/scrapit.svg?branch=master)](https://travis-ci.org/zezutom/scrapit)

Scrapit intercepts HTTP requests and replays captured responses. Its main purpose is to support test automation and daily development work by removing depedencies on 3rd party APIs - typically, but not only, based on JSON or XML.

There is no GUI to this tool. However, the captured responses are stored as plain text files, which makes them easy to access and manipulate. 

## Main Features
* supports the most frequently used HTTP methods (GET, POST, PUT, DELETE)
* caters for various kinds of parameterized requests (query string, url-encoded form data, REST)
* authentic replay - not only the data, but also the status code and response headers
* saved responses uniquely distinguished by headers and parameters of the original request
* minimalistic configuration

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [General Mapping Rules](#general-mapping-rules)
  - [GET](#get)
    - [Parameterless](#parameterless)
    - [Using a Query String](#using-a-query-string)
    - [RESTful](#restful)
    - [Using Request Headers](#using-request-headers)
  - [POST and other methods](#post-and-other-methods)
- [Configuration](#configuration)

## Installation
### Via npm
```
npm install scrapit
```
Before you can run the server you need to set the $NODE_CONFIG_DIR variable in order to specify the location of your [configuration directory](https://github.com/zezutom/scrapit/tree/master/config). For example:
```
export NODE_CONFIG_DIR=~/workspace/scrapit/config
```
Finally, you start server by running `scrapit`

### Using Sources
```
git clone git@github.com:zezutom/scrapit.git
cd scrapit && npm install
```
To run the tool with default settings:
```
npm start
```
You can also run it directly from [CLI](http://en.wikipedia.org/wiki/Command-line_interface):
```
chmod +x ./bin/scrapit
./bin/scrapit
```
## Quick Start
Let's assume your app makes use of the [MediaWiki API](http://www.mediawiki.org/wiki/API:Main_page). There is a lot of cool stuff you can do with that API. For instance, you can get a complete HTML output of a specific wiki page, such as the one giving an in-depth explanation on what [web scraping](http://en.wikipedia.org/w/index.php?action=render&title=web%20scraping) means.

However, for clarity we will only deal with small chunks of data, see the examples below.

*__Example 1:__ A brief summary of the page about web scraping, as JSON*
```
http://en.wikipedia.org/w/api.php?action=query&format=json&continue=&titles=web%20scraping

{
   "batchcomplete":"",
   "query":{
      "normalized":[
         {
            "from":"web scraping",
            "to":"Web scraping"
         }
      ],
      "pages":{
         "2696619":{
            "pageid":2696619,
            "ns":0,
            "title":"Web scraping"
         }
      }
   }
}
```

*__Example 2:__ An identical inquiry, but the requested format is XML*
```
http://en.wikipedia.org/w/api.php?action=query&format=xml&continue=&titles=web%20scraping

<?xml version="1.0" encoding="UTF-8"?>
<api batchcomplete="">
   <query>
      <normalized>
         <n from="web scraping" to="Web scraping" />
      </normalized>
      <pages>
         <page pageid="2696619" ns="0" title="Web scraping" />
      </pages>
   </query>
</api>
```
Now, to break the direct dependency on wikipedia's API content and availability, adjust Scrapit's configuration `config/default.json` as follows:
```
{
   "Server":{
      "host":"localhost",
      "port":8088
   },
   "Mappings":{
      "wiki":{
         "dir":"data/wiki",
         "host":"http://en.wikipedia.org",
         "skipHeaders":true,
      }
   },
   "Timeout":3000
}
```
I hope the entries are self-explanatory. In short, the server will be accessible at `http://localhost:8088` and to connect to the wikipedia you use `http://localhost:8088/wiki` as a base url for any API requests. For simplicity, request headers will not be considered when caching the data. The captured responses will be stored at `data/wiki`. The directory doesn't exist just yet, but that's nothing you need to worry about. 

Once the config changes are saved and the server is started `npm start` or `./bin/scrapit`, you are good to go. 

Okay, so let's see what happens now. API calls are obviously mediated via the localhost. The very first time Scrapit won't have any data, so it makes a roundtrip to wikipedia and captures the returned responses. These two calls yield therefore the same results as before:
```
http://localhost:8088/wiki/w/api.php?action=query&format=json&continue=&titles=web%20scraping
http://localhost:8088/wiki/w/api.php?action=query&format=xml&continue=&titles=web%20scraping
```
Once the calls are made, the captured responses can be accessed as follows:
```
tree data

data
└── wiki
    └── GET
        ├── w__api.php--action=query&format=json&continue=&titles=web%20scraping.mock
        └── w__api.php--action=query&format=xml&continue=&titles=web%20scraping.mock
```
As you can see, both API calls were intercepted and their responses resolved into files. From this point on, any subsequent API calls will not incur additional roundtrips. Scrapit will return locally stored responses. On top of that, you are good to modify the captured data as you wish. There is absolutely no need to restart the server once modifications are made.

Turns out there is a structure (JSON) to the captured content:
```
cat "data/wiki/GET/w__api.php--action=query&format=json&continue=&titles=web%20scraping.mock"

// Formatted output (the content is actually minified)

{
   "code":200,
   "headers":{
      "server":"Apache",
      "x-powered-by":"HHVM/3.3.1",
      "cache-control":"private",
      "x-content-type-options":"nosniff",
      "x-frame-options":"SAMEORIGIN",
      "vary":"Accept-Encoding,X-Forwarded-Proto,Cookie",
      "content-type":"application/json; charset=utf-8",
      "x-varnish":"252843972, 2025257333, 4099851608",
      "via":"1.1 varnish, 1.1 varnish, 1.1 varnish",
      "transfer-encoding":"chunked",
      "date":"Mon, 05 Jan 2015 13:15:17 GMT",
      "age":"0",
      "connection":"keep-alive",
      "x-cache":"cp1065 miss (0), amssq56 miss (0), amssq31 frontend miss (0)",
      "x-analytics":"php=hhvm",
      "set-cookie":[
         "GeoIP=SE:Esl_v:55.8333:13.3333:v4; Path=/; Domain=.wikipedia.org"
      ]
   },
   "body":"{\"batchcomplete\":\"\",\"query\":{\"normalized\":[{\"from\":\"web scraping\",\"to\":\"Web scraping\"}],\"pages\":{\"2696619\":{\"pageid\":2696619,\"ns\":0,\"title\":\"Web scraping\"}}}}"
}
```
To guarantee an authentic replay, Scrapit stores not only the response data represented by the `body` entry, but it also preserves the response code as well as all of the response headers.

Suppose you want to simulate that the respective API call returns a specific status code, let's say 201 instead of 200. In this case you simply modify the `code` entry in the relevant file and resubmit the API call:
```
// Change the saved file

cat "data/wiki/GET/w__api.php--action=query&format=json&continue=&titles=web%20scraping.mock"
..
"code": 201
..

// Scrapit's response after the change is saved

Remote Address:127.0.0.1:8088
Request URL:http://localhost:8088/wiki/w/api.php?action=query&format=json&continue=&titles=web%20scraping
Request Method:GET
Status Code:201 Created
```

With headers turned on, which is the case by default, there would be a bit more directories to dig through. Each of them represents a request header along with its value. The deeply nested hiearchy might look as an overkill, but request headers might be of importance when interacting with the underlying API. That's why they are captured by default.
```
tree data
data
└── wiki
    └── GET
        └── host__localhost~~8088
            └── connection__keep-alive
                └── accept__text__html,application__xhtml+xml,application__xml;q=0.9,image__webp,*__*;q=0.8
                    └── user-agent__Mozilla__5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit__537.36 (KHTML, like Gecko) Chrome__39.0.2171.95 Safari__537.36
                        └── accept-encoding__gzip, deflate, sdch
                            └── accept-language__en,en-US;q=0.8,sv;q=0.6
                                ├── w__api.php--action=query&format=json&continue=&titles=web%20scraping.mock
                                └── w__api.php--action=query&format=xml&continue=&titles=web%20scraping.mock
```

That's for the introduction, hope you found it useful. The remaining sections provide examples of the supported HTTP methods and other details.

# General Mapping Rules
This section outlines the rules of how the captured responses are stored (mapping rules) along with examples of their application on HTTP requests. Suppose the responses are stored in the directory called `data`.

The examples below make use of [JSONTest.com](http://www.jsontest.com/).

## GET
### Parameterless

*__Mapping Rules__*

| Request URL     | Mapped File                       |
| --------------  |-----------------------------      | 
| /hello          | data/xyz/GET/hello.mock           | 
| /greeting/hello | data/xyz/GET/greeting__hello.mock | 

*__Example__*

Configuration `config/default.json`:
```
{
   "Server":{
      "host":"localhost",
      "port":8088
   },
   "Mappings":{
      "echo":{
         "dir":"data/echo",
         "host":"http://echo.jsontest.com",
         "skipHeaders":true
      }
   },
   "Timeout":3000
}
```
Request URL
```
http://localhost:8088/echo/key/value
```
Mapped File
```
data/echo/GET/key__value.mock
```
Captured Data
```
{
   "code":200,
   "headers":{
      "access-control-allow-origin":"*",
      "content-type":"application/json; charset=ISO-8859-1",
      "date":"Sat, 03 Jan 2015 18:29:01 GMT",
      "server":"Google Frontend",
      "cache-control":"private",
      "alternate-protocol":"80:quic,p=0.02,80:quic,p=0.02",
      "transfer-encoding":"chunked"
   },
   "body":"{\"key\": \"value\"}\n"
}
```

### Using a Query String

*__Mapping Rules__*

| Request URL     | Mapped File                   |
| -------------   |-----------------------------  | 
| /hello?a=b      | data/xyz/GET/hello--a=b.mock  | 
| /hello?a=b&c=d  | data/xyz/hello--a=b&c=d.mock  |
| ?a=b&c=d        | data/xyz/a=b&c=d.mock         |

*__Example__*

Configuration `config/default.json`:
```
{
   "Server":{
      "host":"localhost",
      "port":8088
   },
   "Mappings":{
      "validate":{
         "dir":"data/validate",
         "host":"http://validate.jsontest.com",
         "skipHeaders":true
      }
   },
   "Timeout":3000
}
```
Request URL
```
http://localhost:8088/validate?json={%22key%22:%22value%22
```
Mapped File
```
data/validate/GET--json\=\{%22key%22~~%22value%22.mock
```
Captured Data
```
{
   "code":200,
   "headers":{
      "access-control-allow-origin":"*",
      "content-type":"application/json; charset=ISO-8859-1",
      "date":"Sat, 03 Jan 2015 18:45:25 GMT",
      "server":"Google Frontend",
      "cache-control":"private",
      "alternate-protocol":"80:quic,p=0.02,80:quic,p=0.02",
      "transfer-encoding":"chunked"
   },
   "body":"{\n   \"error\": \"Expected a ',' or '}' at 15 [character 16 line 1]\",\n   \"object_or_array\": \"object\",\n   \"error_info\": \"This error came from the org.json reference parser.\",\n   \"validate\": false\n}\n"
}
```

### RESTful

*__Mapping Rules__*

| Request URL     | Mapped File                         |
| --------------  |------------------------------------ | 
| /hello/a/b/c/d  | data/xyz/GET/hello__a__b__c__d.mock | 

*__Example__*

Configuration `config/default.json`:
```
{
   "Server":{
      "host":"localhost",
      "port":8088
   },
   "Mappings":{
      "echo":{
         "dir":"data/echo",
         "host":"http://echo.jsontest.com",
         "skipHeaders":true
      }
   },
   "Timeout":3000
}
```
Request URL
```
http://localhost:8088/echo/key/value/one/two
```
Mapped File
```
data/echo/GET/key__value__one__two.mock
```
Captured Data
```
{
   "code":200,
   "headers":{
      "access-control-allow-origin":"*",
      "content-type":"application/json; charset=ISO-8859-1",
      "date":"Sat, 03 Jan 2015 19:25:45 GMT",
      "server":"Google Frontend",
      "cache-control":"private",
      "alternate-protocol":"80:quic,p=0.02,80:quic,p=0.02",
      "transfer-encoding":"chunked"
   },
   "body":"{\n   \"one\": \"two\",\n   \"key\": \"value\"\n}\n"
}
```

### Using Request Headers

*__Mapping Rules__*

Request URL `/hello`

Request Headers
```
connection: keep-alive
cache-control:private
```

Mapped File
```
data/xyz/GET/connection__keep-alive/cache-control__private/hello.mock
```

*__Example__*

Configuration `config/default.json`:
```
{
   "Server":{
      "host":"localhost",
      "port":8088
   },
   "Mappings":{
      "echo":{
         "dir":"data/echo",
         "host":"http://echo.jsontest.com"
      }
   },
   "Timeout":3000
}
```
Request URL
```
http://localhost:8088/echo/key/value
```

Request Headers
```
Accept:text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Encoding:gzip, deflate, sdch
Accept-Language:en,en-US;q=0.8,sv;q=0.6
Cache-Control:no-cache
Connection:keep-alive
Host:localhost:8088
Pragma:no-cache
```

Mapped File
```
data
├── echo
   └── GET
        ├── host__localhost~~8088
            └── connection__keep-alive
               └── pragma__no-cache
                     └── cache-control__no-cache
                        └── accept__text__html,application__xhtml+xml,application__xml;q=0.9,image__webp,*__*;q=0.8
                                └── accept-encoding__gzip, deflate, sdch
                                   └── accept-language__en,en-US;q=0.8,sv;q=0.6
                                       └── key__value.mock

```
Captured Data
```
{
   "code":200,
   "headers":{
      "access-control-allow-origin":"*",
      "content-type":"application/json; charset=ISO-8859-1",
      "date":"Sat, 03 Jan 2015 19:51:32 GMT",
      "server":"Google Frontend",
      "cache-control":"private",
      "alternate-protocol":"80:quic,p=0.02,80:quic,p=0.02",
      "transfer-encoding":"chunked"
   },
   "body":"{\"key\": \"value\"}\n"
}
```

## POST and Other Methods

Textual form submissions (application/x-www-form-urlencoded) are treated as a [GET with a query string](#using-a-query-string). File uploads (multipart/form-data) and binary data in general aren't supported.

*__Example__*

Configuration `config/default.json`:
```
{
   "Server":{
      "host":"localhost",
      "port":8088
   },
   "Mappings":{
      "md5":{
         "dir":"data/md5",
         "host":"http://md5.jsontest.com",
         "skipHeaders":true
      }
   },
   "Timeout":3000
}
```

POST Request
```
echo 'text=example_text' | curl -d @-  http://localhost:8088/md5
```

Mapped File
```
data/md5/POST/text=example_text.mock
```

Captured Data
```
{
   "code":200,
   "headers":{
      "access-control-allow-origin":"*",
      "content-type":"application/json; charset=ISO-8859-1",
      "date":"Sun, 04 Jan 2015 11:29:28 GMT",
      "server":"Google Frontend",
      "cache-control":"private",
      "alternate-protocol":"80:quic,p=0.02,80:quic,p=0.02",
      "transfer-encoding":"chunked"
   },
   "body":"{\n   \"md5\": \"fa4c6baa0812e5b5c80ed8885e55a8a6\",\n   \"original\": \"example_text\"\n}\n"
}
```

Identical rules apply to a PUT method, whereas a DELETE is treated as a [RESTful GET](#restful) .

# Configuration

Default configuration can be found as `config/default.json`. It should be possible to override the default settings via `config/production.json`, but that hasn't been tested yet. Configuration as a feature fully relies on [node-config](https://github.com/lorenwest/node-config). 

An example of a complete configuration file
```
{
	"Server": {
   		"host": "localhost",
      "port": 8088
  },    
  "Mappings": {
    "wiki": {
    	"dir": "data/wiki",
    	"host": "http://en.wikipedia.org",
      "skipHeaders": true
    },
    "md5":{
      "dir":"data/md5",
      "host":"http://md5.jsontest.com",
      "skipHeaders":true
    }
  },
  "Timeout": 3000
}
```

## Server
Mandatory, specifies host and port on which Scrapit will run.

## Mappings
Mandatory, it must contain at least one API specification.

## Mappings - API specification(s)

Example
```
 "wiki": {
    	"dir": "data/wiki",
    	"host": "http://en.wikipedia.org",
      "skipHeaders": true
    }
```

`dir` and `host` are mandatory.

`dir` defines a relative path to the directory the mocked responses will go to. The default root is `$scrapit_install_dir/data`. In fact, this is the only option at the moment. I plan to add another configuration element (`docRoot`) allowing to set any path in the filesystem.

`host` gives hostname / IP address of the API Scrapit should connect to. It works in tandem with the api key. Given the example above, this call `http://localhost:8088/wiki` would initiate a call to `http://en.wikipedia.org` under the hood.

`skipHeaders` is optional and disabled by default. This option provides a means of how to skip request headers when persisting the captured responses. I might consider replacing this setting with a different option, which would allow to list the headers you are interested in (`reqHeaders: ["header-x", "header-y", ..]`). 


