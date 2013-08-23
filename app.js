#!/usr/bin/node

var config = require('./config.json'),
    async = require('async'),
    fs = require('fs'),
    sniffer = require('./sniffer.js'),
    querystring = require('querystring'),
    request = require('request'),
    util = require('./util.js'),
    homeServer = '',
    hostname='';

process.title = "cellsite";

function scan(callback){
    console.log('TODO implement "hcitool scan"');
    callback();
}

function getNextTarget(results, callback){
    var url = homeServer+'/next' ;
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
            util.log('error', 'could not get next target', err);
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
                util.log('error', 'error sniffing for target=', nextTarget, 'error=', error);
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
                util.log('error', 'could not write heartbeat file', err);
            }else{
                util.log('info', 'wrote heartbeat file');
            }
        });
        lastSetAlive = now;
    }
}

function start(){
    hostname = require('os').hostname();
    homeServer = 'https://'+util.getServer();
    //THE loop
    async.whilst(
        function () { return true; },
        function (callback) {

            util.log('error','asd')
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
            util.log('error', 'error running program', err);
        }
    );
}

start();