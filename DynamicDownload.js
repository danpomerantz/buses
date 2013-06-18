exports.DownloadWithPhantom = DownloadWithPhantom;
exports.SubmitPostRequestWithPhantom = SubmitPostRequestWithPhantom;

//DownloadWithPhantom("http://www.redcoachusa.com", function(x) { console.log("hello!!"); });

//if thread hasn't responded after 60 seconds, kill it
var TIMEOUT = 60000;

function DownloadWithPhantom(searchUrl, callback)
{

var phantom = require('phantom');
var exec = require('child_process').exec;
child = exec('phantomjs DownloadPageWithJscript.js ' + searchUrl, 
  {timeout : TIMEOUT},
  function (error, stdout, stderr) { 
    //  console.log(stdout, stderr);
      if (error || stderr) {
        console.log("Error from child process!" + error);
      }

      if (stdout) {
        //console.log(stdout);
        callback(stdout);
      }
   }

  );
}

  function SubmitPostRequestWithPhantom(server, dataString, callback, errorCallback) {
    SubmitPostRequestWithPhantomRetries(5, server, dataString, callback, errorCallback);
  }

function SubmitPostRequestWithPhantomRetries(retries, server, dataString, callback, errorCallback)
{
  //wait 30 seconds before trying again
  var retryTimeout = 5000;
  if (retries == 0)
  {
    return errorCallback("No more retries. Failed to submit post request");

  }
  var phantom = require('phantom');

  try {
var exec = require('child_process').exec;
//TODO: specify a wait time if phantomjs never finishes to stop
child = exec('phantomjs FillOutSearchForm.js ' + server + ' "' + dataString + '"',
  { timeout : TIMEOUT},
  function (error, stdout, stderr) { 
    //  console.log(stdout, stderr);
      if (error) {
        console.log("error!");
        errorCallback(error);
      }

      if (stderr) {
        console.log("error!");
      }

      if (stdout) {
        //console.log(stdout);
        return callback(stdout);

      }
   }
  );
  }
  catch (exception){
    console.log("Thread failed to spawn....retrying" + exception);
    console.log("Info was " + dataString);
    setTimeout( function() {
      console.log("Retrying: " + dataString);
      SubmitPostRequestWithPhantomRetries(retries - 1, server, dataString, callback, errorCallback);  }, retryTimeout);
//    SubmitPostRequestWithPhantomRetries(retries - 1, server, dataString, callback, errorCallback);
  }
}
