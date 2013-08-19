var exec = require('child_process').exec,
    path = require('path');

module.exports = {
    sniff: function(target, callback){
        var command = path.resolve(__dirname, 'scripts/sniffScript.sh ')+ target;
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

