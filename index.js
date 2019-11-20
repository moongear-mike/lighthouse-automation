var http = require('http');

//create a server object:
http.createServer(function (req, res) {

    if (req.url == '/favicon.ico') {

        return false;

    } else {



    }

}).listen(3000);