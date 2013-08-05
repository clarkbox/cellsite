var logger = require('simple-log').init('cellsite'),
    exec = require('child_process').exec;

module.exports = {
    sniff: function(target, callback){
        var command = './sniffScript.sh '+ target;
        exec(command, function(err, stdout, stderr){
            if(err){
                callback(err);
                return;
            }

            var seekString = 'rssi return value:';
            var rssi = stdout;
            var indexOfRssi = rssi.toLowerCase().lastIndexOf(seekString);

            if(indexOfRssi>-1){
                rssi = rssi.substring(seekString.length, seekString.length+5);
                var regex = /-?(?:[0-9]+(?:\.[0-9]*)?|(?:[0-9]+)?\.[0-9]+)/
                rssi = rssi.match(regex)[0];
            }

            callback(null, rssi);
        });
    }
};

