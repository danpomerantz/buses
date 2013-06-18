//Program to extract bus pages
var JsonQuery = require('./JsonQuery');
var DownloadIntoJson = require('./DownloadIntoJson');
var ExtractionLibrary = require('./ExtractionLibrary');
var sys = require('sys');
RedCoachStopDownloader();


function RedCoachStopDownloader()
{
	var homepage = 'http://www.redcoachusa.com/destinations';
	var linkFunction = function(json) { FindLinksOnHomepageWithCallback(json, ExtractStopsFromPages)}
	var links = DownloadIntoJson.Download(homepage, linkFunction);
	
	//global variable used to figure out when to write from file
	//Might be a better way to do this
	totalPagesLeft = 0;
	ExtractionJsonResults = new Array();
}

function ExtractStopsFromPages(urlList)
{
	var outputFile = "stops.json";
	var urls = urlList["urls"];
	
	totalPagesLeft = urls.length;
	for (var i =0; i < urls.length; i++)
	{
		DownloadIntoJson.Download(urls[i], WriteExtractionToFile.bind(WriteExtractionToFile, urls[i], outputFile));
	}
}

function WriteExtractionToFile(url, filename, parser)
{
	ExtractAndAddResultAsync(url, parser, FileWrite.bind(FileWrite.bind, filename));
}

function FileWrite(file, results)
{
	var fs = require('fs');

	totalPagesLeft--;
	if (totalPagesLeft == 0)
	{
		var extractionJson = JSON.stringify(ExtractionJsonResults);
		fs.writeFile
		(
			file, 
			extractionJson, 
			function(err) { 
				if (err) {
					console.log("Error writing file!");
				}
			}
		);
	}
}

function ExtractAndAddResultAsync(url, parser, callback)
{
	callback(ExtractAndAddResult(url, parser));
}

function ExtractAndAddResult(url, parser)
{
	ExtractionJsonResults.push(FindStopInformationFromPage(url, parser));
}

function FindLinksOnHomepageWithCallback(parser, callback)
{
	callback(FindLinksOnHomepage(parser));
}

//specification of how to find the links on the original page
function FindLinksOnHomepage(parser)
{
	var request = [
		{ name: "urls", 
		  xpath: "html/body/div[id=wrapper]/div[id=main]/div[id=container]/div[id=cities-content]/div[id=cities-left]/div[id=cities-left-black]/div[id=terminals]/a" ,
		  transform : function(raw) { 
		  	var attribute = JsonQuery.GetAttribute(raw, "href");
		  	return RemoveLastSlash(attribute);
		  }
		}
	];

	return ExtractionLibrary.ExtractLists(parser.dom, request);
}

//specification of what to extract and where to extract from the stop stations
function FindStopInformationFromPage(url, parser)
{
	var request = [
		{ name: "latitude", 
		  xpaths: ["html/body/div/div/div/div/div/div/div/div/p/iframe", "html/body/div/div/div/div/div/div/div/div/iframe"] ,
		  transform : ExtractLatitudeFromGoogleLink},
		{ name: "longitude", 
		  xpaths: ["html/body/div/div/div/div/div/div/div/div/p/iframe", "html/body/div/div/div/div/div/div/div/div/iframe"] ,
		  transform : ExtractLongitudeFromGoogleLink},

		{ name: "stop_location", xpaths: ["html/body/div/div/div/div/div/div/div/div/p/strong"], transform : ExtractionLibrary.GetCleanInnerText},
		{ name: "stop_city", 
			xpaths: ["html/body/div/div/div/div/div/div/div/div/h1"], 
			transform : function(json) { 
				return RemoveLastTwoWords(ExtractionLibrary.GetInnerText(json))
			}},
		{ name: "stop_name", 
		  xpaths: ["html/head/link[rel=canonical]"],
		  transform : ExtractionLibrary.GetAttribute.bind(ExtractionLibrary.GetAttribute, "href")}
	]

	return ExtractionLibrary.ExtractFromPages(parser.dom, request);
}


//The following are transformation functions used as the last step of extractions
//removes the final slash of a string. Used for urls that look like http://www.foo.com/bar/
function RemoveLastSlash(original)
{
	//console.log("original is ");
	//console.log(original);
	if (original.charAt(original.length - 1) == '/')
	{
		return original.substring(0, original.length - 1);
	}

	return original;
}

//function to trim the last two words from text (text looks like Miami Bus Stop we want just Miami
function RemoveLastTwoWords(raw)
{
	var pieces = raw.split(" ");
	pieces.pop();
	pieces.pop();
	return pieces.join(" ");
}

//function to use when raw transform is enough
function NoTransform(iframeJson){
	return iframeJson;
}

//function for getting latitude from google map on redcoach stop page
function ExtractLatitudeFromGoogleLink(iframeJson)
{
	var latitudeIndex = 0;
	return ExtractLLPiecesFromGoogleLink(iframeJson)[latitudeIndex];
}

//function for getting longitude from google map on redcoach stop page
function ExtractLongitudeFromGoogleLink(iframeJson)
{
	var longitudeIndex = 1;
	return ExtractLLPiecesFromGoogleLink(iframeJson)[longitudeIndex];
}

//helper function used by latitude and longitude functions above
function ExtractLLPiecesFromGoogleLink(iframeJson)
{
	var attribute = JsonQuery.GetAttribute(iframeJson, "src");
	llRaw = GetLLInformationFromLink(attribute);

	if (llRaw == undefined)
	{
		return undefined;
	}

	llPieces = llRaw.split(',');

	return llPieces;	
}

//turns full url of form google.com/blah&ll=stuff&other into stuff
function GetLLInformationFromLink(raw)
{
	var indexLLStarts = raw.indexOf("ll=");
	if (indexLLStarts < 0)
	{
		return undefined;
	}

	var startPiece = raw.substring(indexLLStarts + 3);
	return startPiece.split("&amp")[0];
}

