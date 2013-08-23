var config = require('./config.json'),
    exec = require('child_process').exec,
    fs = require('fs'),
    request = require('request');

var homeServer = getServer();

function getServer(){
    var home = '';
    try {
        home = fs.readFileSync(config.homeFilePath);
    } catch (e) {
        console.log('error', 'could not get server from ', config.homeFilePath);
        return false;
    }
    return home.toString().replace("\n", '');
}

module.exports = {
    log: function(level){
        var args = Array.prototype.slice.call(arguments, 1);

        if(args && args.length && args.length === 0){
            return;
        }

        request({
            url: 'https://'+ homeServer +'/track',
            strictSSL: false,
            /*auth: {
                'user': config.homeuser,
                'pass': config.homepass,
                'sendImmediately': true
            } */
        }, function (error, response, body) {
            if (error || response.statusCode != 200) {
                var status = 'status code: ';
                if(response && response.statusCode){
                    status += response.statusCode;
                }else{
                    status += '-1';
                }
                console.log('error', 'could not log to server', error, status);
            }
        });
    },
    setHeartbeat: function(value){
        var command = 'echo none >/sys/class/leds/led0/trigger';
        if(parseInt(value) === 1){
            command = 'echo heartbeat >/sys/class/leds/led0/trigger';
        }
        exec(command, function(err, stdout, stderr){});
    },
    getServer: getServer
};
