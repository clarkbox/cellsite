var request = require('request'),
    fs = require('fs'),
    config = require('../config.json'),
    exec = require('child_process').exec,
    gotServer = false,
    server = '';

//find the home server host in file system
fs.readFile('/srv/home', function(err, data){
    if(err){
        console.log('error: could not read home file in '+config.homeFilePath, err);
        return;
    }

    server = ('https://'+data).replace(/[\n\r]/g, '');
    var url = (server+'/getconfig');

    //call the home server and request the config
    request({url:url,strictSSL:false}, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            server = true;
            fs.writeFile('/srv/homeconfig', body);
            processWifiCommands(body);
        }else{
            //did not get config from home server. attempt to use backup stored on /srv/homeconfig
            console.log('error: could not get config from home. looking for /srv/homeconfig', error);
            fs.readFile('/srv/homeconfig', function(err, data){
                if(!err){
                    processWifiCommands(data+'');
                }
                console.log('error','could not run! config not found on home server or in /srv/homeconfig');
            });
        }
    });

});

function processWifiCommands(configStr){
    //example configStr:
    // configStr = '{"wifissid":"blue","wifipass":"changeme", "wifiscan":false, "wifipurgeconnections":false, "wifistopafteraction":false, "wififorceconnection": false}';
    console.log('info','config:', configStr);
    var c = JSON.parse(configStr);

    if(c.wifipurgeconnections){
        deleteAllConnections();
        if(c.wifistopafteraction){
            return;
        }
    }

    if(c.wifiscan){
        wifiScan();
        if(c.wifistopafteraction){
            return;
        }
    }

    getConections(function(connections){
        if(c.wififorceconnection || connections===false){
            connect(c.wifissid, c.wifipass, function(err){
                if(err){
                    console.log('error', 'could not connect to '+ c.wifissid, err);
                    serverLog('couldnt connect to '+ c.wifissid + " error: " + err);
                }else{
                    console.log('info', 'connected to wifi');
                    serverLog('connected to wifi '+ c.wifissid);
                }
            });
        }
    });
}

function getConections(callback){
    exec("nmcli -t -f uuid,name,devices con status", function(err, stdout, stderr){
        if(err){
            callback(false);
            return;
        }
        var connections = stdout.split('\n');
        var wlanConnections = [];
        for(var i=0, len=connections.length;i<len;i++){
            var conn = connections[i].split(':');
            if(conn[2] && conn[2].indexOf('wlan')>-1){
                wlanConnections.push(conn);
            }
        }
        if(wlanConnections.length === 0){
            callback(false);
        }
        callback(wlanConnections);
    });
}

function deleteAllConnections(){
    exec("nmcli -t -f uuid,type con list", function(err, stdout, stderr){
        if(err){
            return;
        }
        var connections = stdout.split('\n');
        for(var i=0, len=connections.length;i<len;i++){
            var conn = connections[i].split(':');
            if(conn[1] && conn[1].indexOf('wireless')>-1){
                deleteConnection(conn[0]);
            }
        }
    });
}

function deleteConnection(uuid){
    exec("nmcli con delete uuid "+uuid, function(err, stdout, stderr){
        if(err){
            console.log('error', 'could not delete connection', err);
            return;
        }else{
            console.log('deleted connection to '+ uuid);
        }
    });
}

function wifiScan(){
    exec("nmcli -t -f ssid,bssid,mode,freq,rate,signal,security,active dev wifi list", function(err, stdout, stderr){
        if(err){
            serverLog('wifiscan: could not scan wifi', err);
        }else{
            serverLog('wifiscan: '+stdout);
        }
    });
}

function connect(ssid, pass, callback){
    if(!ssid){
        return 'need ssid';
    }

    var command = "nmcli dev wifi connect " + ssid;
    if(pass){
        command += " password "+ pass;
    }

    exec(command, function(err, stdout, stderr){
        //TODO monitor stdout/err?
        if(err){
            callback(err);
        }else{
            callback();
        }
    });
}

function serverLog(message){
    if(!gotServer){
        return;
    }
    var url = server+'/track?source=setwifi&message='+message;
    request({url:url,strictSSL:false});
}