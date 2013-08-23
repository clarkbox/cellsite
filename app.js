#!/usr/bin/node

var logger = require('simple-log').init('cellsite'),
    config = require('./config.json'),
    async = require('async'),
    fs = require('fs'),
    sniffer = require('./sniffer.js'),
    querystring = require('querystring'),
    request = require('request'),
    homeServer = '',
    hostname='';

process.title = "cellsite";

function getServer(callback){
    fs.readFile(config.homeFilePath, function(err, data){
        if(err){
            callback(err);
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
        strictSSL:false,
        auth: {
            'user': config.homeuser,
            'pass': config.homepass,
            'sendImmediately': true
        }
    }, function(err, response, body){
        if(err || response.statusCode !== 200){
            logger.error('could not get next target', err, 'response.statusCode: '+response.statusCode);
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
            if(err){
                console.error('could not get next target', err);
                //dont hammer
                setTimeout(callback, 1000);
            }else{
                nextTarget = sniffFor;
                callback();
            }
        });
    }
}

var lastSetAlive = 0;
function setAlive(){
    //only try to write it once every 30 seconds
    var now = (new Date()).getTime();
    if((lastSetAlive + 30000) < now){
        fs.writeFile(config.heartbeatFile, now, function(err){
            if(err){
                logger.error('could not write heartbeat file', err);
            }else{
                console.log('wrote heartbeat file');
            }
        });
        lastSetAlive = now;
    }
}

function start(){
    hostname = require('os').hostname();
    getServer(function(err, server){
        homeServer = server;
        if(err){
            logger.error('could not get home server', err);
        }else{
            //THE loop
            async.whilst(
                function () { return true; },
                function (callback) {
                    setAlive();
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