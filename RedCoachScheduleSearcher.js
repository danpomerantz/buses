var JsonQuery = require('./JsonQuery');
var DownloadIntoJson = require('./DownloadIntoJson');
var ExtractionLibrary = require('./ExtractionLibrary');
var sys = require('sys');
var searchUrl = "http://www.redcoachusa.com";
//var searchUrl = "https://websales.redcoachusa.com/public/websale/index";
//var searchUrl = "http://www.google.com";
var zombie = require('zombie');
//var linkFunction = function(json) { ExtractionLibrary.FindLinksWithTransformationAsync(json.dom, linkXPath, RemoveLastSlash, ExtractStopsFromPages); }

var linkFunction = function(json) { FindDeparturesAndArrivalsWithCallback(json, DisplayExtractionResults)}
//var SnapABug = require('SnapABug');
//var browser = new zombie({ debug: true});
//browser.runScripts = true;
//browser.maxWait(1);
var sys = require('sys');
var browser = new zombie({debug: false, maxWait : 50000});
browser.visit(searchUrl).
then(function() { console.log("hello!");})
.fail(function(error) { console.log("not good");  console.log(error);});

//browser.maxWait(5000);
//browser.visit(searchUrl, function(error,browse) {
//	console.log("Done");
//sys.puts(browse);
//browser.fill('txtDeparture', 'Miami-Airport, FL')
//	browser.select("idDeparture", 'Miami-Airport, FL');
//	browser.fill('departureCity', 'Miami-Airport, FL')
//		.fill('arrivalCity', 'Orlando, FL')
//		.pressButton('Buscar', function() {browser.viewInBrowser(); browser.close(); })
	//	.fill('dDate', '06-17-2013');

//	;
//browser.viewInBrowser();

//;
//	sys.puts(browser.html());
	//browser.close();
//});
//zombie.visit(searchUrl, function(error, browser){});

/*browser.on("error", function(error) { 
	//sys.puts(sys.inspect(browser, false, null));
	console.log(browser.html());
	browser.viewInBrowser(); });
browser.on("done", function(browser) { console.log("It's done now?"); 
	//console.log(browser.html()); 
	});
browser.visit(searchUrl, function (error, browser) {
	if (error) {
		console.log("error message:");
		console.log(error.message);
	}

	//browser.wait(1000, )
});*/
/*zombie.visit(searchUrl, {debug: true, runScripts: false},
	function (error, browser) {
		if (error) {
			console.log("Here is the message: ");
			console.log(error.message);
		}
		console.log(browser.html());
		console.log(browser.statusCode);
		//browser.close();
	})*/


//.on("error", function(error) {console.log("error!"); })
//;

//var links = DownloadIntoJson.Download(searchUrl, linkFunction);

//var formUrl = "https://websales.redcoachusa.com/public/websale/index";

var querystring = require('querystring');
var http = require('http');
var fs = require('fs');

//PostCode("foo");

/*
var request = require('request');

request.post(
    formUrl,
    { form: { //quatrobus_idDeparture: 'Fort Lauderdale-Airport, FL', 
   date_format:"US",
rbtnTravelway:"0",
idDeparture:"13",
idCityNearDeparture: "",
txtDeparture:"Miami-Airport, FL",
idArrival:"9",
idCityNearArrival: "",
txtArrival:"Orlando, FL",
departureDate:"06-17-2013",
returnDate: ""}},
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body)
        }
    }
);*/

function PostCode(codestring) {
  // Build the post string from an object
  var post_data = querystring.stringify({
      'compilation_level' : 'ADVANCED_OPTIMIZATIONS',
      'output_format': 'json',
      'output_info': 'compiled_code',
        'warning_level' : 'QUIET',
        'js_code' : codestring
  });

  // An object of options to indicate where to post to
  var post_options = {
     // host: 'closure-compiler.appspot.com',
     host: 'websales.redcoachusa.com',
      port: '80',
      path: '/public/websale/index',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': post_data.length
      }
  };

  // Set up the request
  var post_req = http.request(post_options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          console.log('Response: ' + chunk);
      }).on('error', function(err) {console.log(err); console.log("error"); });;
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
  }


function FindDeparturesAndArrivalsWithCallback(parser, callback)
{
	callback(FindDeparturesAndArrivals(parser));
}

//specification of how to find the links on the original page
function FindDeparturesAndArrivals(parser)
{
	console.log("starting to find departures and arrivals");
	var requests = [
		{ name: "destinations", 
//		  xpath: "html/body/div[id=wrapper]/div[id=main]/div/div/div/div/div" ,
		  xpath: "html/body/div[id=wrapper]/div[id=main]/div[id=container]/div" ,

		  transform : function(raw) { 
		  	/*var attribute = JsonQuery.GetAttribute(raw, "href");
		  	return RemoveLastSlash(attribute);*/
		  	return raw;
		  }
		}
	];

	//console.log("About to return:");
	//console.log(ExtractionLibrary.ExtractLists(parser.dom, request));
	return ExtractionLibrary.ExtractLists(parser.dom, requests);
}

function DisplayExtractionResults(urlList)
{
	console.log(urlList);
}
