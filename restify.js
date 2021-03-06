const http = require('http');
const fs = require("fs");
const querystring = require('querystring');
const url = require('url');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');


if (cluster.isMaster) {

    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });

} else {

    // Workers can share any TCP connection
    // In this case it is an HTTP server
    http.createServer(function (req, res) {

        let url_vars = getJsonFromUrl(req.url);

        process.on('unhandledRejection', error => {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(error.name + ': ');
            res.write(error.code + '\n');
            res.write(error.friendlyMessage);
            res.write('<script>parent.iframe_loaded();</script>');
            res.end();
            console.log('unhandledRejection', error.message);
        });

        console.log(req.url);

        if (req.url == '/favicon.ico') {

            return false;

        } else if (req.url == '/' || req.url == '') {

            fs.readFile("index.html", "utf8", function (err, contents) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(contents);
                res.end();
            });

        } else {

            var api_keys = new Array();

            api_keys = [
                '6c996bed-8152-4518-98f6-b763c522beb8',  // World facing test mode
                'fe1eb3d5-1fde-4836-9d56-cf5c3ad5315b',
                '89d833dc-98b5-46de-8e13-e3a8aa57bb22',
                '61d8e0ed-6acf-4b0f-9219-c560e140d0c8',
                '5395f963-82e6-4105-82ef-fbf91788e8a4',
                '46c43b94-01d6-4f9e-9d18-dfa8bcf54ea4',
            ];

            if (!(api_keys.indexOf(url_vars['lh_api_key']) > -1)) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write('Um, no API key?  Sorry.');
                res.write('<script>parent.iframe_loaded();</script>');
                res.end();
                return false;
            }


            console.log(url_vars);

            const opts =

                {
                    chromeFlags: [
                        '--headless'
                    ],
                    "output": [
                        "html"
                    ],
                    "output-path": "./reports/report.html",
                    "save-assets": true,
                    "maxWaitForLoad": 45000,
                    "throttlingMethod": url_vars['lh_throttle_method'],
                    "throttling": {
                        "rttMs": 150,
                        "throughputKbps": 1638.4,
                        "requestLatencyMs": 15,
                        "downloadThroughputKbps": 1474.5600000000002,
                        "uploadThroughputKbps": 675,
                        "cpuSlowdownMultiplier": 1
                    },
                    "gatherMode": false,
                    "disableStorageReset": false,
                    "emulatedFormFactor": url_vars['lh_form_factor'],
                    "blockedUrlPatterns": null,
                    "additionalTraceCategories": null,
                    "extraHeaders": null,
                    "onlyAudits": null,
                    "onlyCategories": [
                        url_vars['lh_categories_accessibility'],
                        url_vars['lh_categories_best_practices'],
                        url_vars['lh_categories_performance'],
                        url_vars['lh_categories_seo'],
                        url_vars['lh_categories_pwa']
                    ],
                    "skipAudits": null
                };

            const url = url_vars['lh_schema'] + url_vars['lh_website'];

            if (!validURL(url)) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write('Ooops!  Go back and check the Website field.  ');
                res.write('<script>parent.iframe_loaded();</script>');
                res.end();
                return;
            }

            console.log('Testing ' + url);

            var html_out = launchChromeAndRunLighthouse(url, opts).then(function (value) {

                try {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.write(value[0]);
                    res.write('<script>parent.iframe_loaded();</script>');

                    fs.writeFile("lh-result-" + url_vars['lh_website'] + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(' ', '_') + ".html", value[0], function(err) {
                        if(err) {
                            return console.log(err);
                        }
                        console.log("The file was saved!");
                    });


                    res.end();
                } catch (error) {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    console.log(error);
                    res.write('Error');
                    res.write('<script>parent.iframe_loaded();</script>');
                    res.end();
                }
                return value;
            });


            // The Functions
            // The Functions
            // The Functions
            // The Functions
            // The Functions


            async function launchChromeAndRunLighthouse(url, opts, config = null) {
                return chromeLauncher.launch({chromeFlags: opts.chromeFlags}).then(chrome => {
                    opts.port = chrome.port;
                    return lighthouse(url, opts, config).then(results => {
                        return chrome.kill().then(() => results.report)
                    });
                });
            }

            function getJsonFromUrl(url) {
                if (!url) url = location.href;
                var question = url.indexOf("?");
                var hash = url.indexOf("#");
                if (hash == -1 && question == -1) return {};
                if (hash == -1) hash = url.length;
                var query = question == -1 || hash == question + 1 ? url.substring(hash) :
                    url.substring(question + 1, hash);
                var result = {};
                query.split("&").forEach(function (part) {
                    if (!part) return;
                    part = part.split("+").join(" "); // replace every + with space, regexp-free version
                    var eq = part.indexOf("=");
                    var key = eq > -1 ? part.substr(0, eq) : part;
                    var val = eq > -1 ? decodeURIComponent(part.substr(eq + 1)) : "";
                    var from = key.indexOf("[");
                    if (from == -1) result[decodeURIComponent(key)] = val;
                    else {
                        var to = key.indexOf("]", from);
                        var index = decodeURIComponent(key.substring(from + 1, to));
                        key = decodeURIComponent(key.substring(0, from));
                        if (!result[key]) result[key] = [];
                        if (!index) result[key].push(val);
                        else result[key][index] = val;
                    }
                });
                return result;
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
        }

    }).listen(3000);


    console.log(`Worker ${process.pid} started`);

}
