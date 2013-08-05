var logger = require('simple-log').init('cellsite'),
    http = require('http'),
    config = require('./config.json'),
    async = require('async'),
    fs = require('fs'),
    _ = require('underscore'),
    sniffer = require('./sniffer.js'),
    querystring = require('querystring');

var state = {};

function now(){
    return (new Date).getTime();
}

function httpPost(options, data, callback){
    var req = http.request(options, function(response){
        var str = '';
        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            callback(null, response, str);
        });

        response.on('error', function () {
            callback('error getting post response from server');
        });
    }).on('error', function(){
        callback('cant post to server');
    });

    var query = querystring.stringify(data);
    req.write(query);
    req.end();
}

function updateBootCount(callback){
    var current = 0;

    function writeBootCount(){
        fs.writeFile(config.bootCounterFile, current+1, function(err){
            if(err){
                logger.warn('could not update boot count file', err);
                return;
            }
            logger.log('got boot count file bootnumber=', current+1);
        });
    }

    //TODO dont check for exists. just read, and handle the error
    fs.exists(config.bootCounterFile, function(exists){
        if(exists){
            fs.readFile(config.bootCounterFile, function(err, data){
                if(err){
                    logger.warn('could not read boot count file', err);
                    callback(null, -1);
                    return;
                }

                current = parseInt(data+'');
                if(isNaN(current)){
                    current = 0;
                }

                writeBootCount();
                callback(null, current);
            });

        }else{
            writeBootCount();
            callback(null, current);
        }
    });
}

function getIpAddresses(callback){
    var interfaces = require('os').networkInterfaces();
    var addresses = [];
    for (k in interfaces) {
        for (k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family == 'IPv4' && !address.internal) {
                addresses.push(address.address)
            }
        }
    }
    logger.log('got IP addresses', addresses);
    callback(null, addresses);
}

function getHostname(callback){
    var name = require('os').hostname();
    logger.log('got hostname=', name);
    callback(null, name);
}

function getServer(){
    //TODO one day this will attempt to contact each server, and return only that which responds
    return config.defaultServer;
}

function sniffScriptChmod(callback){
    logger.log('setting sniffScript to chmod=', 777);
    fs.chmod('./sniffScript.sh', 777, callback);
}

function callHome(){
    //TODO call home and let them know we are alive!
    //should post to the cellserver with our state
    console.log('TODO callHome not implemented')
}

function scan(callback){
    console.log('TODO implement "hcitool scan"');
    callback();
}

function getNextTarget(results, callback){
    httpPost({
        host: config.defaultServer.url,
        path: config.defaultServer.next,
        port: config.defaultServer.port,
        method: 'POST'
    }, results, function(err, res, data){
        if(err){
            logger.warn('could not reach cellserver endpoint error=', err);
            callback('could not reach cellserver endpoint');
            return;
        }

        if(res.statusCode != 200){
            logger.warn('could not reach cellserver endpoint status=', res.statusCode  );
            callback('could not reach cellserver endpoint status other than 200');
            return;
        }

        var target = data;
        callback(null, target);
    });
}

var nextTarget;
function sniff(callback){
    //logger.log('sniffing');
    var sniffResult={};
    if(nextTarget){
        sniffer.sniff(nextTarget, function(error, result){
            sniffResult.target = nextTarget;
            sniffResult.host = state.hostname;

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

function initialize(callback){
    async.parallel({
        hostname: getHostname,
        bootCount: updateBootCount,
        ips: getIpAddresses,
        sniffMod: sniffScriptChmod,
        server: getServer
    },
    function(err, results){
        callHome();
        results.home = config.defaultServer;
        state = results;
        callback();
    });
}

function start(){
    initialize(function(){
        async.whilst(
            function(){return true},
            function(callback){
                async.series([
                    function(callback){
                        sniff(callback);
                    },
                    function(callback){
                        scan(callback);
                    }
                ]);
            },
            function (err) {
                logger.warn('sniffer stopped or there was error=',err);
            }
        );
    });
}

start();