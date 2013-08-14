var logger = require('simple-log').init('cellsite'),
    http = require('http'),
    config = require('./config.json'),
    async = require('async'),
    fs = require('fs'),
    _ = require('underscore'),
    sniffer = require('./sniffer.js'),
    querystring = require('querystring'),
    request = require('request');

var state = {};

function getServer(callback){
    fs.readFile('/srv/home', function(err, data){
        if(err){
            callback(err, data);
        }else{
            var server = ('https://'+data).replace(/[\n\r]/g, '');
            callback(err, server);
        }
    });
}

function scan(callback){
    console.log('TODO implement "hcitool scan"');
    callback();
}

function getNextTarget(results, callback){
    var url = homeServer+'/next';
    request({
        url: url,
        method:'post',
        body: querystring.stringify(results, '&', '='),
        strictSSL:false
    }, function(err, response, body){
        if(err || response.statusCode !== 200){
            logger.error('could not get next target', err);
            callback(err);
            return;
        }
        callback(null, body);
    });
}

var nextTarget;
function sniff(callback){
    var sniffResult={};
    if(nextTarget){
        sniffer.sniff(nextTarget, function(error, result){
            sniffResult.target = nextTarget;
            sniffResult.host = hostname;
            if(error){
                logger.error('error sniffing for target=', nextTarget, 'error=', error);
                sniffResult.found = false;
                sniffResult.message = 'could not find target';
            }else{
                sniffResult.rssi = result;
                sniffResult.found = true;
            }
            getNextTarget(sniffResult, function(err, sniffFor){
                nextTarget = sniffFor;
                callback();
            });
        });
    }else{
        getNextTarget(null, function(err, sniffFor){
            nextTarget = sniffFor;
            callback();
        });
    }
}

var homeServer = '',
    hostname='';
function start(){
    hostname = require('os').hostname();
    getServer(function(err, server){
        homeServer = server;
        if(err){
            logger.error('could not get home server from disk', err);
        }else{

            async.whilst(
                function () { return true; },
                function (callback) {
                    async.series([
                        sniff,
                        scan,
                        function(){
                            callback();
                        }
                    ]);

                },
                function (err) {
                    console.log('error running program', err);
                }
            );
        }
    });
}

start();