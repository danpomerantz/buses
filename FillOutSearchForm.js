var system = require('system');
var server = system.args[1];
var data = system.args[2];
//delay is used to help make sure all jscript is loaded before executing
var timeDelay = 10000;
if (system.args.length >= 4)
{
	timeDelay = parseInt(system.args[3]);
}

SubmitPostRequest(server, data);

function SubmitPostRequest(server, data)
{
	var page = require('webpage').create();

	page.open(server, 'post', data, 
		function (status) { 
			setTimeout( function() {  
				ProcessResults(page, status); 
			}, timeDelay); 
		}
   	);
}

function ProcessResults(page, status) {
	if (status !== 'success') {
       		console.error('Unable to complete post request!');
    } 
    else {
       	console.log(page.content);
    }
    
    phantom.exit();
}

