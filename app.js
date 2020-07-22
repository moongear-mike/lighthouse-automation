// lighthouse-batch -o './reports' -s https://www.moongear.com

const {exec} = require('child_process');
const path = require('path');
const fs = require('fs');

const request = require('request');
const https = require('https');
const directoryPath = '/home/light/public_html/';


global.do_process_queue = async () => {

    console.log(directoryPath);

    await fs.readdir(directoryPath + 'reports/queue/', function (err, files) {

        for (const file of files) {
            const result = handleFile(file);
            console.log(file);
            console.log('Finished Creating file.');
            fs.unlinkSync(directoryPath + 'reports/queue/' + file);
        }

        console.log('Finished process queue.');

        checkExistsWithTimeout(directoryPath + 'working.txt', 1000).catch(() => {
            console.log('died');
        });

    });
};

const handleFile = thisfile => {
    return new Promise((resolve, reject) => {
        fs.readFile(directoryPath + 'reports/queue/' + thisfile, "utf8", function (err, contents) {
            if (contents !== '') {
                fs.appendFile(directoryPath + 'working.txt', contents + '\n', function (err) {
                    if (err) throw err;
                });
            }
        });
    });
};

async function do_process_runs() {

    console.log('Started runs...');

    await exec('lighthouse-batch  -o "' + directoryPath + 'reports/data/" -p "--quiet" -f ' + directoryPath + 'working.txt --html --params "--only-categories=performance,accessibility,seo,best-practices"', (err, stdout, stderr) => {  // --quiet
        if (err) {
            // node couldn't execute the command
            console.log(err);
            fs.unlinkSync(directoryPath + 'working.txt');
            return;
        }

        // the *entire* stdout and stderr (buffered)
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        fs.unlinkSync(directoryPath + 'working.txt');


        const testFolder = directoryPath + 'reports/data/';

        fs.readdir(testFolder, (err, files) => {

            files.forEach(file => {
                if (file === 'summary.json') return;

                console.log('Handling file...');
                console.log(file);

                var options = {
                    host: 'www.moongear.com',
                    path: '/wp-content/plugins/moongear-lighthouse/lh_reports.php?filename=' + file,
                };

                console.log('Sent pick up request');

                var req = https.get(options, function(res) {
                    console.log('STATUS: ' + res.statusCode);
                    console.log('HEADERS: ' + JSON.stringify(res.headers));

                    // Buffer the body entirely for processing as a whole.
                    var bodyChunks = [];
                    res.on('data', function(chunk) {
                        // You can process streamed parts here...
                        bodyChunks.push(chunk);
                    }).on('end', function() {
                        var body = Buffer.concat(bodyChunks);
                        console.log('BODY: ' + body);
                        // ...and/or process the entire body here.
                    })
                });


            });
        });
    });
}

function checkExistsWithTimeout(filePath, timeout) {
    return new Promise(function (resolve, reject) {

        var timer = setTimeout(function () {
            watcher.close();
            reject(new Error('File did not exists and was not created during the timeout.'));
        }, timeout);

        fs.access(filePath, fs.constants.R_OK, function (err) {
            if (!err) {
                clearTimeout(timer);
                watcher.close();
                console.log('Ready to run process.');
                do_process_runs();
                resolve(true);
            }
        });

        var dir = path.dirname(filePath);
        var basename = path.basename(filePath);
        var watcher = fs.watch(dir, function (eventType, filename) {
            if (eventType === 'rename' && filename === basename) {
                clearTimeout(timer);
                watcher.close();
                console.log('Ready to run process.');
                do_process_runs();
                resolve(true);
            }
        });
    });
}

