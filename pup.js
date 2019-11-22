const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const request = require('request');
const util = require('util');

(async() => {

    const URL = 'https://www.moongear.com';

    const opts =

        {
            chromeFlags: [
                '--headless'
            ],
            "output": [
                "html"
            ],
            "save-assets": true,
            "maxWaitForLoad": 45000,
            "throttlingMethod": 'mobile', // url_vars['lh_throttle_method']
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
            // "emulatedFormFactor": url_vars['lh_form_factor'],
            "blockedUrlPatterns": null,
            "additionalTraceCategories": null,
            "extraHeaders": null,
            "onlyAudits": null,
            // "onlyCategories": [
            //     url_vars['lh_categories_accessibility'],
            //     url_vars['lh_categories_best_practices'],
            //     url_vars['lh_categories_performance'],
            //     url_vars['lh_categories_seo'],
            //     url_vars['lh_categories_pwa']
            // ],
            "skipAudits": null
        };

// Launch chrome using chrome-launcher.
    const chrome = await chromeLauncher.launch(opts);
    opts.port = chrome.port;

// Connect to it using puppeteer.connect().
    const resp = await util.promisify(request)(`http://localhost:${opts.port}/json/version`);
    const {webSocketDebuggerUrl} = JSON.parse(resp.body);
    const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});

// Run Lighthouse.
    const {report}  = await lighthouse(URL, opts, null);  // await
    console.log(`${Object.values(report)}`);

    await browser.disconnect();
    await chrome.kill();

})();