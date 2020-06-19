const request = require('request');
request('https://www.moongear.com/', function (error, response, body) {
    console.log(response.statusCode); // Print the response status code if a response was received
});