//runs in phantom js as separate process
//usage: phantomjs DownloadPageWithJscript.js urlToDownload [timeout]
var system = require('system');
var searchUrl = system.args[1];

//amount of time to wait for jscript to load (default is 10000)
var javascriptWaitTime = 10000;
if (system.args.length >= 3)
{
	console.log("Setting timeout...");
	javascriptWaitTime = parseInt(system.args[2]);
}

var page = require('webpage').create();
page.open(searchUrl, function(status) {
	//wait 10 seconds to make sure all jscript executes
	setTimeout(function() {

		OutputData(status);
		phantom.exit();
	}, javascriptWaitTime);
});

function OutputData(status) {
	if (status !== 'success') {
       	console.error('Unable to download javascriptpage!');
    } 
	else
	{
		console.log(page.content);
	}	
}



