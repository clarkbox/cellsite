#!/usr/bin/node

var fs = require('fs'),
    async = require('async'),
    config = require('../config.json'),
    exec = require('child_process').exec,
    request = require('request');

function callHome(callback){
    callback();
}

function reboot(){
    callHome(function(){
        console.error('\n-------------------\nREBOOOOOOOTING\n-------------------\n');
        //exec reboot
    });
}

var lastRead = 0,
    retrys = 0;
async.whilst(
    function () { return true; },
    function (callback) {

        var now = (new Date()).getTime();
        if(((lastRead + (config.watchdogDelay*60000))) < now){
            console.log('watchdog checking for heartbeat');
            fs.readFile(config.heartbeatFile, function(err, data){
                if(err){
                    console.error('could not read heartbeat file');
                    //dont hammer
                    if(retrys > config.watchdogRetrys){
                        reboot();
                        callback('could not read heartbeat file after maximum retrys')
                    }
                    setTimeout(callback, 1000);
                    retrys++;
                }else{
                    lastRead = now;
                    retrys=0;
                    if((parseInt(data+'') + (config.watchdogTimeout*60000)) < now){
                        callback('watchdog is rebooting system');
                        reboot();
                    }else{
                        callback();
                    }
                }
            });
        }else{
            setTimeout(callback, 1000);
        }

    },
    function (err) {
        console.log('error running program', err);
    }
);
