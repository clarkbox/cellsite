!#/bin/sh

## make sure the scripts are executable
chmod -R 740 *.js *.sh
dos2unix *.js *.sh && dos2unix scripts/*.js scripts/*.sh

## run firstboot check
./firstboot.sh

## set the initial heartbeat file (used by app.js and watchdog.js)
echo 0 > /tmp/heartbeat