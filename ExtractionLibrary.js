exports.ExtractFromPages = ExtractFromPages;
exports.ExtractLists = ExtractLists;
exports.GetInnerText = GetInnerText;
exports.GetCleanInnerText = GetCleanInnerText;
exports.CleanText = CleanText;
exports.GetAttribute = GetAttribute;
exports.NoTransform = NoTransform;
var JsonQuery = require('./JsonQuery');
var htmlparser = require('htmlparser');
var htmlencode = require('htmlencode');

//function to extract several lists. The purpose is to get *all* elements
//of certain types. For example, extract all the urls on a page
//Each request looks like the following:
//example: { name: "url", 
//	  xpaths: ["html/body/div[id=wrapper]/div[id=main]/div[id=container]/div[id=cities-content]/div[id=cities-left]/div[id=cities-left-black]/div[id=terminals]/a"] ,
//	  transform : RemoveLastSlash} }
//name is what each thing is
//xpaths are where to find them
//transform is what to do afterwards (text operation)
function ExtractLists(jsonDom, requests)
{
	//console.log(jsonDom);
	var extractionResults = new Object();
	//console.log(requests);
	for (var i = 0; i < requests.length; i++)
	{
		//extractionResults = extractionResults.concat(ExtractList(jsonDom, requests[i]));
		//extractionResults.push(ExtractList(jsonDom, requests[i]));
		//console.log(extractionResults);
		var list = ExtractList(jsonDom, requests[i]);
		extractionResults[requests[i].name] = list[requests[i].name];
		
	}

	return extractionResults;
}

function ExtractList(jsonDom, request)
{
	//example: { name: "url", 
	//	  xpaths: ["html/body/div[id=wrapper]/div[id=main]/div[id=container]/div[id=cities-content]/div[id=cities-left]/div[id=cities-left-black]/div[id=terminals]/a"] ,
	//	  transform : RemoveLastSlash}
	//console.log(request);
	var rawList = JsonQuery.GetTagsByXPath(jsonDom, request.xpath);
	//console.log(jsonDom);
	//apply the transformation to each one
	var list = new Array();

	for (var i = 0; i < rawList.length; i++)
	{
		//console.log("found something!");
		var extraction = new Object();
		list.push(request.transform(rawList[i]));
	}

	var listObject = new Object();
	listObject[request.name] = list;
	return listObject;
}

//wrapper function
function ExtractFromPagesAsync(jsonDom, extractionRequests, callback)
{
	callback(ExtractFromPages(jsonDom, extractionRequests));
}

//takes as input array of extractionRequests
//extractionRequests are an array of extractionRequests
//Each extraction request looks like:
//name : string for attribute name
//xpaths : array of xpaths
//transformation : function specifying what string manipulations to do after extraction
function ExtractFromPages(jsonDom, extractionRequests)
{
	//ExtractionRequests is an array of objects containing:
	//extraction name
	//where to find raw data (xpath)
	//function to transform data
	var extractionResults = new Object();
	for (var i = 0; i < extractionRequests.length; i++)
	{
		var extractedResult = TryExtractions(jsonDom, extractionRequests[i].xpaths, extractionRequests[i].transform)
	
		extractionResults[extractionRequests[i].name] = extractedResult;
	}

	return extractionResults;
}

//helper function used to try a particular xpath/transformation
//returns undefined if unsuccesful
//returns string of data if successful
function TryExtractions(jsonDom, attributeRequests, transformation)
{
	for (var i = 0; i < attributeRequests.length; i++)
	{
		var nodeInfo = JsonQuery.GetTagByXPath(jsonDom, attributeRequests[i]);
		if (nodeInfo != undefined)
		{
			//try text based transformation
			var transformed = transformation(nodeInfo);
			if (transformed != undefined)
			{
				return transformed;
			}
		}
	}

	return undefined;
}

function NoTransform(raw)
{
	return raw;
}

//extracts the text nodes at a particular level. Does not get deeper nodes.
function GetInnerText(json)
{
	var textNodes = htmlparser.DomUtils.getElementsByTagType("text", json);
	var merged = "";
	for (var i = 0; i < textNodes.length; i++)
	{
		merged = merged + textNodes[i]["raw"];
	}

	//decode text to remove html formatting e.g &amp;
	var decoded = htmlencode.htmlDecode(merged);

	return decoded;
}

function GetCleanInnerText(json)
{
	return CleanText(GetInnerText(json));
}

//replace new line with " "
//remove special characters such as &amp and replace with &
function CleanText(text)
{
	//console.log(text);
	//remove all the new lines
	return text.replace(/(\r\n|\n|\r)/gm, " ");
}

function GetAttribute(attributeName, json)
{
	return JsonQuery.GetAttribute(json, attributeName);
}

