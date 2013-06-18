var http = require('http');
var page = "http://www.redcoachusa.com/destinations";

var options = {
	host: 'www.redcoachusa.com',
	port: 80,
	path: '/destinations'
};

var pageContent = "";

function responseCallback(response) {
	console.log("Got response: " + response.statusCode);
	response.setEncoding("utf8");
	response.on("data", function(chunk) { console.log("adding stuff"); pageContent += chunk; } );
	//check if "end" is guaranteed to be sent by server?
	response.on("end", function() {  console.log("Done downloading!") ;
				parse(pageContent);});

}

function errorHandler(error) {
	//custom behaviour based on the kind of error?
	//try to follow redirects?
	//allow retries?
	console.log("Error : " + error.message);
}

request = http.get(options, responseCallback)
	.on('error', errorHandler);

request.end();

var htmlparser = require("htmlparser");

var sys = require("sys");
/*
var rawHtml = "Xyz <script language= javascript>var foo = '<<bar>>';< /  script><!--<!-- Waah! -- -->";
var handler = new htmlparser.DefaultHandler(function (error, dom) {
    if (error)
        console.log("error!");
    else
        console.log("foo");
});
var parser = new htmlparser.Parser(handler);
parser.parseComplete(rawHtml);
//sys.puts(sys.inspect(handler.dom, false, null));
*/


function parse(content) {
	var parserCallback = new htmlparser.DefaultHandler(function(error, dom) {
   	if (error) {
     	 	console.log("error parsing :(");
   	}
   	else {
      	console.log("parse successful!");
	//getNodes(parser, 'html');
	var information = parseExactNodePath(dom);
	sys.debug("name: " + sys.inspect(information[0], false, null));
  	 }
	});

	var parser = new htmlparser.Parser(parserCallback );
	parser.parseComplete(content);
	//sys.puts(sys.inspect(parserCallback.dom, false, null));
	//select all nodes which have particular path
	//var path = "html/body/"
}

function parseExactNodePath(dom) {
	var html = htmlparser.DomUtils.getElementsByTagName("html", dom);
	//sys.debug("name: " + sys.inspect(html, false, null));
	var body = htmlparser.DomUtils.getElementsByTagName("body", html[0]);
	var div1s = htmlparser.DomUtils.getElements({ tag_name : "div", id : "wrapper"}, body);
	var div2s = htmlparser.DomUtils.getElements({ tag_name : "div", id: "main"}, div1s[0]);
	var div3s = htmlparser.DomUtils.getElements({ tag_name : "div", id: "container"}, div2s[0]);
	var div4s = htmlparser.DomUtils.getElements({ tag_name : "div", id: "cities-content"}, div3s[0]);
	var div5s = htmlparser.DomUtils.getElements({ tag_name : "div", id: "cities-right"}, div4s[0]);
	var div6s = htmlparser.DomUtils.getElements({ tag_name : "div", id: "cities-left-col"}, div5s[0]);
	var div7s = htmlparser.DomUtils.getElements({ tag_name : "div", id: function(value) { return (value && value.substring(0,4) == "cit-");}}, div6s[0]);
	var myRawDatas = new Array();
	for (i = 0; i < div7s.length; i++) {
		var url = htmlparser.DomUtils.getElements({ 	
	

		myRawDatas[i] = { stop_name : "stop", stop_city:"stop city", stop_location:"stop_location"};
	}
return div7s;
}

function getNodes(json, name) {
	for (i = 0; i < json.length; i++) {
	//	if (json[i].type == 'tag') {
			console.log(json[i].name);
	//	}
	}
}

