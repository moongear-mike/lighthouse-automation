const fs = require("graceful-fs");
const url = require('url');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const request = require('request');
const puppeteer = require('puppeteer');
const util = require('util');
const ps = require('ps-node');
const express = require('express');
const app = express();
const https = require('https');
// const http = require('http');
const {exec} = require('child_process');

const serveIndex = require('serve-index');
const port = 3000;

var cron = require('node-cron');

//exceute every 1 min
// console.log('Cron Start.....');
// cron.schedule('*/2 * * * *', function(){
//     exec('node app.js > cron.log');
// });

// /usr/bin/node /home/ubuntu/lighthouse/app.js

// Whitelisted ip addresses
const ip_addresses = [
    '::ffff:75.188.73.180',
    '127.0.0.1',
    '99.203.186.205',
    '::ffff:192.168.1.50',
    '::ffff:192.168.1.1',
    '::ffff:99.203.65.59',
    '::ffff:24.166.65.97',
    '108.170.62.213',
    '192.168.1.1',
    '108.170.49.204',
    '::ffff:108.170.62.213',
    '::ffff:108.170.62.114',
];

// Active API keys
const api_keys = [
    '6c996bed-8152-4518-98f6-b763c522beb8',
    'fe1eb3d5-1fde-4836-9d56-cf5c3ad5315b',
    '89d833dc-98b5-46de-8e13-e3a8aa57bb22',
    '61d8e0ed-6acf-4b0f-9219-c560e140d0c8',
    '5395f963-82e6-4105-82ef-fbf91788e8a4',
    '46c43b94-01d6-4f9e-9d18-dfa8bcf54ea4',
    '92a78ee8-19a1-449e-abc8-ab4824bcc109',
    'e1abcd6a-f083-4c6e-a765-9822776e2e72',
];

ps.lookup({
    command: '(\w*chrom\w*)',
    arguments: '',
}, function (err, resultList) {
    if (err) {
        throw new Error(err);
    }
    resultList.forEach(function (process) {
        if (process) {
            ps.kill(process.pid, function (err) {
                if (err) {
                    throw new Error(err);
                } else {
                    console.log('Process %s has been killed!', pid);
                }
            });
        }
    });
});


// app.use(express.urlencoded());

app.use(express.static('reports'));

app.use(express.static(__dirname + "/"));
app.use('/report/lighthouse', serveIndex(__dirname + '/report/lighthouse', {'view': 'details'}));

app.use(express.urlencoded({extended: true}));

// This index page
app.get('/', (req, res) => {
    fs.readFile("index.html", "utf8", function (err, contents) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(contents);
        res.end();
        console.log('Wrote index chunk.');
    });

});

// This index page
app.get('/favicon.ico', (req, res) => {
    favicon = "data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAD/0lEQVR4Xu2aj7EMQRCHfy8CRIAIEAEiQASIABEgAkSACBABIkAEiAARUF+Zrpraur2Z7pnZd7e3U3X1ql7tznR/8+vu+bNnOvF2duL+awOwKeDECWwhcOIC2JLgFgJbCCxD4KakW+l3UdL1ybBfJf2W9Cn9Pi9jlobmAJx8JOmuJJz2NGC8l/RKEnCGtRE5AMdfpNk2w3+mmcUpnONnjvE8gPgBC6VczjxGFU9GgegNAMcfZ8Yzg28CxgPlQVKQdfdS0vMEr5siegG4IuldFttvJT2T9KPRUvqln/upH1TzMAB01oweAJitj0nCSB0Z945bxiB8CA3C53avMVoB5M5/S/GLgSMaOYJ8cK0nhBYAyPNLmnkkT8wu0cgphEQXJbQAwHkUwMxP6/poEIQYSuAv4RBWXRQAiempJGIe58MGBEkRDjhPTqDS5JXH1WUEAA4z+7QbvZKRy+r/D3exIwKAjM9iZcm4n+Nj+YDkSCi4mxcAie97GuXqTJ3/O2NF7Vie93N7QmqsNcp8MuL74s7jwC5W3vdZIbLnCCnSC+BXKnv7aJsD3r7n5Fvqz3IBifiSNwY8RhL3xD+ZH+lFDfbaWAJAfyy5qQjkAfJBdfMAsNJXklqNwRjY8zkLTTZL2FndPABYi9+RdC+ty1sV0BMA+w82Yx/SXmQIAFv5uWU2Y00tgBpnLDxZHJGfqptHAWZwqNzssKgngHxR5PHJdSTWavBceZuycTmQvRyyzzNYaIAdBpbk6bEp7ytkn2ewYwgB987UA8C2oIecBDlOJyFWNw+AYyiDQwEcw0KI43P2BtXNowCrtSw72Qm2LoRqjaxJbuxQWZ67S7QHAAaz4bhQGKjG4Frnea7Un60BSnuUnWN6AdjW8xC3w6GjMS+AQz4QmTug2as2LwA6s2pQ2hV6ZB591naBYVsiAJqPoaLeTt7L1/+h2ae/CADes5JIRSDznsexOJmf43H3GUAOMgqAPvLLCdcWtIMCbGvuXvhMx24BQCgAgbJILHJru0R7na7h/qTa36S+FgA4SxxyBgeE5muqAj3kzpmkXcN1Ga8VwBQCOYEjsxHX4xx5oTpmnnHO9W5wOlkYRnnEKBohQXLq8YEEd5B280zMc/5Hs6vyJiX0UEAOw6qD/Y+VIzXaqwhkzhV4fuk5zfb59wJhCL0B4Pj0sxb+hxKYMftIChnnH0mRQ/KPpPJ7h32f2zRDGAHAZh8nmEHki4OexsYGWCioFEZNEEYCyB1G0sSufRLHh5PW7KNI+1ASx0tOT2GGISwFwDP70WdDENYEAHBuCGsD4IawRgAuCGsFMIUwu2NcMwCDQCmevTJfO4BiRdkAFBGt/IFNASuf4KJ7J6+Af1+CBFDSbROOAAAAAElFTkSuQmCC";
    const im = favicon.split(",")[1];
    const img = Buffer.from(im, 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': img.length
    });
    res.end(img);
});


// This index page
app.get('/adddomain', (req, res) => {


    var fullurl = req.query.domain;
    var hostname = url.parse(fullurl).hostname;
    var filepart = hostname.replace(/\./g, '_');
    var filename = './reports/queue/domain_' + filepart + '.txt';

    try {
        if (!fs.existsSync(filename)) {

            request(fullurl, function (error, response, body) {
                console.log(response.statusCode);
                if (response.statusCode !== 200) {
                    fullurl = '';
                    console.log('Bad website.');
                }
            });

            if (fullurl === '') {
                return;
            }

            // Need some error checking
            fs.writeFile(filename,fullurl, function() {
                return true;
            });
            message = 'Added to Queue'
        }
        else {
            message = 'Already in Queue'
        }
    } catch(err) {
        message = err;
        console.error(err)
    }




    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(message);
    res.end();
    console.log('Wrote index chunk.');

    console.log(filename);
    console.log(message);


});

app.get('/runqueue', (req, res) => {

    var filename = './working.txt';

    try {
        if (!fs.existsSync(filename)) {
            message = 'Starting Queue';
            require('./app.js');
            do_process_queue();

        }
        else {
            message = 'Processing Queue';
        }
    } catch(err) {
        message = err;
        console.error(err)
    }

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(message);
    res.end();
    console.log('Wrote index chunk.');
    console.log(message);
});

app.post('/[0-9]+', (req, res) => {

    var writeChunk = '';
    var doWrite = true;
    var stopProcess = '';
    var chromeisbusy = 0;
    var post_vars = req.body;

    post_vars = typeof post_vars === 'undefined' ? [] : post_vars;

    console.log(post_vars);

    if (typeof post_vars['lh_api_res_type'] === 'undefined') {
        api_res_type = 'html';
    }


    ps.lookup({
        command: '(\w*chrom\w*)',
        arguments: '',
    }, function (err, resultList) {
        if (err) {
            throw new Error(err);
        }
        if (resultList.length) {
            console.log('Chrome is busy.');
        }
        var haschrome = setchromebusy(resultList.length);
    });



    function setchromebusy(chromevar) {
        chromeisbusy = chromevar;

        console.log('Chrome processes: ' + chromeisbusy);

        if (chromeisbusy) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write('<div id="server-busy" data-status="' + chromeisbusy + '"></div>');
            res.write('<script>parent.iframe_loaded();</script>');
            res.end();
            console.log('Stopped.');
            return false;
        } else {

            // Get the IP address of the requesting party
            var ip = req.headers['x-real-ip'] ||
                req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                (req.connection.socket ? req.connection.socket.remoteAddress : null);


            console.log(ip);

            // Was an API key provided or is the request from a whitelisted ip address?
            if (!(api_keys.indexOf(post_vars['lh_api_key']) > -1) && !(ip_addresses.indexOf(ip) > -1)) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write('Um, bad API key for ' + ip + '?  Sorry.');
                res.write('<script>parent.iframe_loaded();</script>');
                res.end();
                console.log('Killed. No API key ot whitelist IP.');
            } else {

                // Validate lighthouse options
                // Validate lighthouse options
                // Validate lighthouse options
                // Validate lighthouse options
                // Validate lighthouse options
                // Validate lighthouse options

                // Check lh_throttle_method: if defined then if allowed value
                // Check lh_throttle_method: if defined then if allowed value
                // Check lh_throttle_method: if defined then if allowed value
                if (typeof post_vars['lh_throttle_method'] === 'undefined') {
                    lh_throttle_method = 'provided';
                } else {
                    lh_throttle_method = ["devtools", "provided", "simulate"].indexOf(post_vars['lh_throttle_method']) ? post_vars['lh_throttle_method'] : 'provided';
                }

                // Check lh_form_factor: if defined then if allowed value
                // Check lh_form_factor: if defined then if allowed value
                // Check lh_form_factor: if defined then if allowed value
                if (typeof post_vars['lh_form_factor'] === 'undefined') {
                    lh_form_factor = "mobile";
                } else {
                    lh_form_factor = ["mobile", "desktop", "none"].indexOf(post_vars['lh_form_factor']) ? post_vars['lh_form_factor'] : 'mobile';
                }

                // Check lh_categories: if defined then if allowed values
                // Check lh_categories: if defined then if allowed values
                // Check lh_categories: if defined then if allowed values
                if (typeof post_vars['lh_categories'] === 'undefined') {
                    lh_categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];
                } else if (!post_vars['lh_categories'].length) {
                    lh_categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];
                } else {
                    lh_categories = [];
                    post_vars['lh_categories'].forEach(function (category) {
                        if (Array(['performance', 'accessibility', 'best-practices', 'seo', 'pwa']).indexOf(category)) {
                            lh_categories.push(category);
                        }
                        lh_categories = lh_categories.length ? lh_categories : ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'];
                    });
                }

                // Check lh_option_output: if defined then if allowed values
                // Check lh_option_output: if defined then if allowed values
                // Check lh_option_output: if defined then if allowed values
                if (typeof post_vars['lh_option_output'] === 'undefined') {
                    lh_option_output = ["html"];
                } else if (!post_vars['lh_option_output'].length) {
                    lh_option_output = ["html"];
                } else {
                    lh_option_output = [];
                    post_vars['lh_option_output'].forEach(function (output_type) {
                        if (Array(["json", "html", "csv"]).indexOf(output_type)) {
                            lh_option_output.push(output_type);
                        }
                        lh_option_output = lh_option_output.length ? lh_option_output : ["html"];
                    });
                }

                // Other options= defaults
                // Other options= defaults
                // Other options= defaults
                let lh_option_save_assets = false;
                let lh_option_logLevel = 'quiet';   // verbose, quiet
                let lh_option_maxWaitForLoad = 45000;
                let lh_option_rttMs = 150;
                // Throttling
                let lh_option_throughputKbps = 1638.4;
                let lh_option_requestLatencyMs = 15;
                let lh_option_downloadThroughputKbps = 1474.5600000000002;
                let lh_option_uploadThroughputKbps = 675;
                let lh_option_cpuSlowdownMultiplier = 1;
                // More...
                let lh_option_gatherMode = false;
                let lh_option_disableStorageReset = false;
                let lh_option_emulatedFormFactor = lh_form_factor;
                let lh_option_blockedUrlPatterns = null;
                let lh_option_additionalTraceCategories = null;
                let lh_option_extraHeaders = null;
                let lh_option_onlyAudits = null;
                let lh_option_skipAudits = null;


                // Create option object
                // Create option object
                const opts =
                    {
                        chromeFlags: [
                            '--headless'
                        ],
                        "output": lh_option_output,
                        // logLevel: lh_option_logLevel,
                        "save-assets": true,
                        "maxWaitForLoad": lh_option_maxWaitForLoad,
                        "throttlingMethod": lh_throttle_method,
                        "throttling": {
                            "rttMs": lh_option_rttMs,
                            "throughputKbps": lh_option_throughputKbps,
                            "requestLatencyMs": lh_option_requestLatencyMs,
                            "downloadThroughputKbps": lh_option_downloadThroughputKbps,
                            "uploadThroughputKbps": lh_option_uploadThroughputKbps,
                            "cpuSlowdownMultiplier": lh_option_cpuSlowdownMultiplier
                        },
                        "gatherMode": lh_option_gatherMode,
                        "disableStorageReset": lh_option_disableStorageReset,
                        "emulatedFormFactor": lh_form_factor,
                        "blockedUrlPatterns": lh_option_blockedUrlPatterns,
                        "additionalTraceCategories": lh_option_additionalTraceCategories,
                        "extraHeaders": lh_option_extraHeaders,
                        "onlyAudits": lh_option_onlyAudits,
                        "onlyCategories": lh_categories,
                        "skipAudits": lh_option_skipAudits
                    };

                const url = post_vars['lh_schema'] + post_vars['lh_website'];

                if (!validURL(url)) {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.write('The domain name ' + url + ' does not appear to be valid.');
                    res.write('<script>parent.iframe_loaded();</script>');
                    res.end();
                    console.log('Bad URL: ' + url );
                    console.log('Wrote chunk.');
                } else {

                    console.log('Now testing ' + url);

                    launchChromeAndRunLighthouse(url, opts).then(results => {

                        try {
                            html_out = results[0];
                            writeChunk = html_out;

                        } catch (error) {
                            console.log(error);
                            writeChunk = 'Error';
                        }

                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.write(writeChunk);
                        res.write('<script>parent.iframe_loaded();</script>');
                        res.end();
                        console.log('Test Completd.');
                        console.log('Wrote chunk.');

                        return true;
                    });
                }

            }
        }
    }

    // Handle Error
    // Handle Error
    // Handle Error
    // Handle Error
    // Handle Error
    // Handle Error

    process.on('unhandledRejection', error => {
        writeChunk = writeChunk + error.name + ': ';
        writeChunk = writeChunk + error.code + '\n';
        writeChunk = writeChunk + error.friendlyMessage;
        // res.write(writeChunk);
        // res.write('<script>parent.iframe_loaded();</script>');
        // res.end();
        ps.lookup({
            command: '(\w*chrom\w*)',
            arguments: '',
        }, function (err, resultList) {
            if (err) {
                throw new Error(err);
            }
            resultList.forEach(function (process) {
                if (process) {
                    ps.kill(process.pid, function (err) {
                        if (err) {
                            throw new Error(err);
                        } else {
                            console.log('Process %s has been killed!', pid);
                        }
                    });
                }
            });
        });

        console.log('unhandledRejection', error.message);
    });


    // The Functions
    // The Functions
    // The Functions
    // The Functions
    // The Functions

    async function launchChromeAndRunLighthouse(url, opts, config = null) {

        // Launch chrome using chrome-launcher.
        const chrome = await chromeLauncher.launch(opts);
        opts.port = chrome.port;

        // Connect to it using puppeteer.connect().
        const resp = await util.promisify(request)(`http://localhost:${opts.port}/json/version`);
        const {webSocketDebuggerUrl} = JSON.parse(resp.body);
        const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});

        // Run Lighthouse.
        const {report} = await lighthouse(url, opts, null);  // await

        await browser.disconnect();
        await chrome.kill();

        return report;
    }

    function validURL(str) {
        var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
        return !!pattern.test(str);
    }

});



// Change the 404 message modifing the middleware
app.use(function (req, res, next) {
    console.log('Service not available right now.  404' + req.url);
    res.status(404).send("Service not available right now.");
});



// we will pass our 'app' to 'https' server
// http.createServer({
//     // key: fs.readFileSync('./privkey.pem'),
//     // cert: fs.readFileSync('./fullchain.pem'),
//     // passphrase: 'Lumina4037'
// }, app).listen(3000);

// start the server in the port 3000 !
app.listen(3000, function () {
    console.log('Lighthouse API listening on port 3000.');
});

