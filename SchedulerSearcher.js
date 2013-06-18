var DynamicDownload = require('./DynamicDownload');
var DownloadIntoJson = require('./DownloadIntoJson');
var ExtractionLibrary = require('./ExtractionLibrary');
var JsonQuery = require('./JsonQuery');

var ticketInformations = new Array();
var spawnedThreads = 0;
var MAX_OPEN_THREADS = 10;
var possiblePairs = 0;
var failCallbacks = 0;

//metrics
var failedSpawns = 0;
var successfulPageExtractions = 0;
var failedExtractions = new Array();
DynamicDownload.DownloadWithPhantom("http://www.redcoachusa.com", 
	DownloadIntoJson.ParseHtml.bind(DownloadIntoJson.ParseHtml, ExtractRedCoachInformation));

function ExtractRedCoachInformation(parser)
{
	var extractedResults = FindDeparturesAndArrivals(parser);

	if (extractedResults.departures.length == 0)
	{
		console.error("Could not extract list of departures. Possibly javascript did not finish downloading before page was extracted from.")
		return [];
	}
	
	//now, let's generate all pairs
	var cityPairs = GetDepartureArrivalPairs(extractedResults);

	var daysToSearch = 5;
	//used to figure out when we are done
	possiblePairs = daysToSearch * cityPairs.length;
	FindTickets(cityPairs, daysToSearch)
}

function FindTickets(cityPairs, daysToSearch)
{
	var currentDate = new Date();
	for (var i = 0; i < daysToSearch; i++) {
		currentDate.setDate(currentDate.getDate() + 1);	
		var dateString = FormatDateForRedCoach(currentDate);	
		FindOneWayTickets(cityPairs, dateString);
	}
}

function GetDepartureArrivalPairs(extractedResults)
{
	console.log(extractedResults);
	var departures = extractedResults["departures"];
	var pairs = new Array();

	for (var i = 0; i < departures.length; i++)
	{
		//take from departures as we actually are just making a list of all the cities
		//In theory, there might be a city with no departures from there and we would not pick it up
		//(could do a union of departures and arrivals in that case)
		for (var j = 0; j < departures.length; j++)
		{
			if (departures[i].id != departures[j].id)
			{
				var pair = new Object();
				pair["departure"] = departures[i];
				pair["arrival"] = departures[j];
				pairs.push(pair);
			}
		}

	}

	return pairs;
}

//specification of how to find the links on the original page
function FindDeparturesAndArrivals(parser)
{
	var sys = require('sys');
	console.log("Generating departure list....");
	var requests = [
		{ name: "departures", 
		  xpath: "html/body/div[id=wrapper]/div[id=main]/div[id=container]/div/div/div/form/div/div/select[id=quatrobus_idDeparture]/option" ,

		  transform : function(raw) { 
		  	return GeneratePairFromAttributes(raw, "data-value_text", "value");
		  }
		} , 

		{ name: "arrivals", 
		  xpath: "html/body/div[id=wrapper]/div[id=main]/div[id=container]/div/div/div/form/div/div/select[id=quatrobus_idArrival]/option" ,

		  transform : function(raw) { 
		  	return GeneratePairFromAttributes(raw, "data-value_text", "value");
		  }
		}
	];

	//sys.puts(sys.inspect(parser.dom, false, null));
	//sys.puts(sys.inspect(ExtractionLibrary.ExtractLists(parser.dom, requests), false, null));
	return ExtractionLibrary.ExtractLists(parser.dom, requests);
}

function FindOneWayTickets(cityPairs, date)
{
	//just get the first one for now.
	for (var i = 0; i < cityPairs.length; i++)
	{
		FindOneWayTicketsFromPairThreadManager(cityPairs[i], date);
	}
}

//function given the location and date, will extract all the ticket informations for it
function FindTicketsByLocationsAndDate(cityPair, date)
{
	return FindOneWayTicketsFromPair(cityPair, date);
}

function FindOneWayTicketsFromPairThreadManager(cityPair, date) {
	if (spawnedThreads > MAX_OPEN_THREADS) {
		//recall this function after a delay
		//console.log("too many open threads now....waiting "  + spawnedThreads);
		setTimeout( function() { FindOneWayTicketsFromPairThreadManager(cityPair, date); }, 30000);
	}
	else {
		FindOneWayTicketsFromPair(cityPair, date);
	}
}

//Submits a post request (using external process of jsphantom) with particular search words
function FindOneWayTicketsFromPair(cityPair, date, error)
{
    if (error != undefined)
    {
    	console.log("Retrying");
    }
	var data = ConstructPostData(cityPair, date);
	var server = 'https://websales.redcoachusa.com/public/websale/index';

	var departureName = cityPair.departure.name;
	var arrivalName = cityPair.arrival.name;

	spawnedThreads++;
	
	DynamicDownload.SubmitPostRequestWithPhantom(server, data, 
		DownloadIntoJson.ParseHtml.bind(DownloadIntoJson.ParseHtml, 
					ExtractInfoFromSearchResultsWithCallback.bind(ExtractInfoFromSearchResultsWithCallback, departureName, arrivalName, date, WriteResults)),
				ErrorHandle.bind(ErrorHandle, cityPair, date)
		);
	
}

function ErrorHandle(cityPair, date, error)
{
	console.log("An error occurred in extracting from " + cityPair.departure.name + " to " + cityPair.arrival.name + " on " + date + ".");
	console.log("error was: " + error);
	failedSpawns++;
	possiblePairs--;
	spawnedThreads--;
}

function ErrorHandleResults(departure, arrival, date, error)
{
	console.log("An error occurred in extracting from " + departure + " to " + arrival + " on " + date + ".");
	console.log("error was: " + error);
	possiblePairs--;
	spawnedThreads--;
}

function ExtractInfoFromSearchResultsWithCallback(departure, arrival, date, callback, json)
{
	spawnedThreads--;
	//console.log("Returned from page " + spawnedThreads);
	//will call the callback unless an error is thrown.
	//If an error is thrown due to an extraction issue then we don't bother extracting that pages results
	try {
		var results = ExtractInfoFromSearchResults(departure, arrival, date, json);
		//could possibly pass to call back info about depature/arrival for logging
		if (results.length == 0)
		{
			failedExtractions.push( { departure : departure, arrival : arrival, date: date});
		}
		callback(ExtractInfoFromSearchResults(departure, arrival, date, json));
	}
	//log the message, decrease spawned threads
	catch (exception) {
		ErrorHandleResults(departure, arrival, date, exception);
	}
}

function ExtractInfoFromSearchResults(departure, arrival, date, parser)
{
	//check to make sure the search results are for the correct place
	//Alternatively, we could decide to extract whatever locations we found there instead.
	if (!CheckSearchResults(departure, arrival, date, parser))
	{
		throw "Search results don't match attempted search " + departure + " " + arrival + " "  + date;
	}

	var ticketList = FindTicketListFromJson(parser);
	var extractedResults = new Array();
	for (var i = 0; i < ticketList.tickets.length; i++)
	{
		var flatFormat = ExtractTicketInformation(ticketList.tickets[i], departure, arrival, date)
		extractedResults.push(TransformToRicherFormat(flatFormat));
	}

	return extractedResults;
}

//requested format is {
//			'origin': 'Miami-Airport, FL',
//			'destination': 'Orlando, FL',
//			'departure_time': '2013-06-18T12:45:00',
//			'arrival_time': '2013-06-18T17:30:00',
//			'duration': '4:45',
//			'service': 'first class',
//			'price': {
//				'non refundable': 48.00,
//				'standard': 50.00,
//				'refundable': 53.00
//			}
//But we extracted a flat format
// {
//	departure_time: '2013-06-18T08:30:00.000Z',
 //   arrival_time: '2013-06-18T15:50:00.000Z',
 //   service: 'First Class',
  //  duration: '07:20',
  //  non_refundable_price: undefined,
  //  standard_price: '74.00',
 //   refundable_price: '78.00',
 //   origin: 'Gainesville, FL',
 //   destination: 'Fort Pierce, FL' } 
function TransformToRicherFormat(flatTicketInformation)
{
	var transformed = new Object();
	transformed.origin = flatTicketInformation.origin;
	transformed.destination = flatTicketInformation.destination;
	transformed.departure_time = flatTicketInformation.departure_time;
	transformed.arrival_time = flatTicketInformation.arrival_time;
	transformed.duration = flatTicketInformation.duration;
	transformed.service = flatTicketInformation.service;

	var priceInfo = new Object;
	priceInfo.standard = flatTicketInformation.standard_price;
	priceInfo.refundable = flatTicketInformation.refundable_price;
	priceInfo.non_refundable = flatTicketInformation.non_refundable_price;
	transformed.price = priceInfo;
	return transformed;
}

function WriteResults(extractedInformation)
{
	var fs = require('fs');
	ticketInformations = ticketInformations.concat(extractedInformation);
	//to know if anything is happening
	process.stdout.write(".");
	possiblePairs--;
	successfulPageExtractions++;

	if (possiblePairs == 0)
	{
		var extractionJson = JSON.stringify(ticketInformations);
		fs.writeFile
		(
			"departures.json",
			extractionJson, 
			function(err) { 
				if (err) {
					console.log("Error writing file!");
				}
			}
		);


		console.log("The following pages had no extracted tickets found.")
		for (var i = 0; i < failedExtractions.length; i++)
		{
			console.log(failedExtractions[i]);
		}

		console.log("Total failed spawns: " + failedSpawns);
		console.log("Total tickets extracted: " + ticketInformations.length);
		console.log("Successful pages extracted from: " + successfulPageExtractions);
		console.log("No tickets extracted on " + failedExtractions.length + " pages.")
	}
}

//extract the departure, arrival and dates from the page to make sure they are what we expect.
function CheckSearchResults(departure, arrival, date, parser)
{
	var request = [
		{ name: "departure", 
		  xpaths: ["html/body/div/div/div/div/div/div/div/div/form/input[id=txtDeparture]"] ,

		  transform : function(raw) {
		  	return ExtractionLibrary.GetAttribute("value", raw);
		  }
		} , 

		{ name: "arrival", 
		  xpaths: ["html/body/div/div/div/div/div/div/div/div/form/input[id=txtArrival]"] ,

		  transform : function(raw) { 
				    	return ExtractionLibrary.GetAttribute("value", raw);
		  }
		},
		  
		{ name: "date", 
		  xpaths: ["html/body/div/div/div/div/div/div/div/div/form/input[id=departureDate]"] ,
		  transform : function(raw) { 
				  	return ExtractionLibrary.GetAttribute("value", raw);
		  }
		}
	];

	var extractionResults = ExtractionLibrary.ExtractFromPages(parser.dom, request);
	return extractionResults.departure == departure && extractionResults.arrival == arrival && extractionResults.date == date;
}

function FindTicketListFromJson(parser) {
	var sys = require('sys');
	var requests = [
		{ name: "tickets", 
		  xpath: "html/body/div/div/div/div/div/div/table/tbody/tr" ,
		  transform : function(raw) { 
		  	return raw;
		  }
		} , 
	];

	return ExtractionLibrary.ExtractLists(parser.dom, requests);
}

//This is a table column which has all the information for one ticket. 
//We will parse it to extract specific information
function ExtractTicketInformation(ticketInfoJson, origin, destination, date)
{
	var sys = require('sys');
	var request = [
		{ name: "departure_time", 
		  xpaths: ["tr/td{0}/div"] ,
		  transform : function(raw) { 
				  	var innerText = ExtractionLibrary.GetInnerText(raw);
				  	return RedCoachDateExtractor(date, innerText);
		  }
		} , 

		{ name: "arrival_time", 
		  xpaths: [ "tr/td{1}/div" ],
		  transform : function(raw) { 
				var innerText = ExtractionLibrary.GetInnerText(raw);
				return RedCoachDateExtractor(date, innerText);
		  }
		},
		  
		{ name: "service", 
		  xpaths: ["tr/td{2}/div"] ,
		  transform : function(raw) { 
				return ExtractionLibrary.GetInnerText(raw);
		  	}
		} , 
		{ name: "duration", 
		  xpaths: ["tr/td{5}/div"] ,
		  transform : function(raw) { 
				  	return ExtractionLibrary.GetInnerText(raw);
		  	}
		} , 

		  //if no price is available returns undefined anyway
		   { name: "non_refundable_price", 
		  xpaths: ["tr/td{6}/div"] ,
		  transform : function(raw) { 
		  			var innerText = ExtractionLibrary.GetInnerText(raw);
		  			return PriceExtraction(innerText);
		  	}
		  } , 

		  	   { name: "standard_price", 
		  xpaths: ["tr/td{7}/div"] ,
		  transform : function(raw) { 
		  			var innerText = ExtractionLibrary.GetInnerText(raw);
		  			return PriceExtraction(innerText);
		  	}
		  } , 

		  	   { name: "refundable_price", 
		  xpaths: ["tr/td{8}/div"] ,
		  transform : function(raw) { 
		  			var innerText = ExtractionLibrary.GetInnerText(raw);
		  			return PriceExtraction(innerText);
		  	}
		  }  ,


		 { name: "origin", 
		  xpaths: ["tr"] ,
		  transform : function(raw) { 
		  			return origin;
		  	}
		  }  ,
		  	 { name: "destination", 
		  xpaths: ["tr"] ,
		  transform : function(raw) { 
		  			return destination;
		  	}
		  }  
	];

 var extractionResults = ExtractionLibrary.ExtractFromPages([ticketInfoJson], request);
	return extractionResults;
}


//for now limited to the redbus page
function PriceExtraction(raw)
{
	var pieces = raw.split(' ');
	return pieces[1].replace(',', '');
}

//removes "detalle" and potentially "route detail"
//time format extracts as 10:00AM which fails to parse, inserts a space
//remove everything after am as we already know the date and redcoach does not list the year component
function RedCoachDateExtractor(date, innerText)
{
 	//insert a space after AM or PM so date parses properly
 	innerText = innerText.replace("AM", " AM").replace("PM", " PM");
 
 	//remove everything after AM or PM
 	var amIndex = innerText.lastIndexOf("AM");
 	var pmIndex = innerText.lastIndexOf("PM");
 	if (amIndex >= 0) {
 		innerText = innerText.substring(0, amIndex + 2);
 	}

 	if (pmIndex >= 0) {
 		innerText = innerText.substring(0, pmIndex + 2);
 	}

 	//red coach does not list the year on their page. We have the info due to the search though so we
 	//can append it here.
 	var withYear = date + " " + innerText;

 	//this is a key attribute, so it is required. If date is bad throw an exception.
 	return new Date(withYear.trim()).toISOString();
}

function ConstructPostData(cityPair, date)
{	
	var departureName = cityPair.departure.name;
	var departureId = cityPair.departure.id;
	var arrivalName = cityPair.arrival.name;
	var arrivalId = cityPair.arrival.id;
	return 'departureDate=' + date + '&txtDeparture=' + departureName + '&txtArrival=' + 
  			 arrivalName + '&date_format=US&idDeparture=' + departureId + '&idArrival=' + arrivalId;
}

function GeneratePairFromAttributes(selectTag, name, id)
{
	var pair = new Object;
	pair["name"] = JsonQuery.GetAttribute(selectTag, name);
	pair["id"] = JsonQuery.GetAttribute(selectTag, id);
	return pair;
}

//format should be MM-DD-YYYY
function FormatDateForRedCoach(date) {
    var month = date.getMonth() + 1; //0 based index
    var day = date.getDate();
    var year = date.getFullYear();

    var result = "";

    if (month < 10) {
    	result = result + "0";
    }

    result = result + month + "-";

    if (day < 10) {
    	result = result + "0";
    }

    result = result + day + "-" + year;
    return result;
}