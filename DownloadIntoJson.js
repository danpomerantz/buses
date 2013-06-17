exports.Download = downloadAndParse;

//executes callback with the input being a json formatted object representing the html page
function downloadAndParse(urlString, callback)
{
	var http = require('http');
	var url = require('url');
	var parsed = url.parse(urlString);
	var options = {
		host: parsed.host,
		port: 80,
		path: parsed.path
	};

	var parseBound = parse.bind(parse, callback);
	var parseFunction = function(response) { responseCallback(response, parseBound); }
	var request = http.get(options, parseFunction).on('error', errorHandler);
	request.end();
}

//response callback takes as input a 2nd argument which specifies what the next step should be.
//For downloadAndParse, the next step is to parse
function responseCallback(response, nextStep) {
	response.setEncoding("utf8");
	var pageContent = "";
	response.on("data", function(chunk) { pageContent += chunk; } );
	//check if "end" is guaranteed to be sent by server?
	response.on("end", function() { 
	nextStep(pageContent);
	});

}

function errorHandler(error) {
	//custom behaviour based on the kind of error?
	//try to follow redirects?
	//allow retries?
	console.log("Error : " + error.message);
}

function parse(callback, content) {

	var htmlparser = require('htmlparser');
	var sys = require('sys');
	var parserCallback = new htmlparser.DefaultHandler(function(error, dom) {
	   	if (error) {
   	  	 	console.log("error parsing :(");
   		}
   		else {
      		callback(parserCallback);
  	 	}
	});

	var parser = new htmlparser.Parser(parserCallback);
	parser.parseComplete(content);
}
