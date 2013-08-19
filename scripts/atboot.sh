#!/bin/sh

SCRIPT_DIR=$(readlink -f ${0%/*})

#set heartbeat led
$SCRIPT_DIR/ledheartbeat.sh 1

## make sure the scripts are executable
chmod -R 740 $SCRIPT_DIR/*.js $SCRIPT_DIR/*.sh
chmod -R 740 $SCRIPT_DIR/../*.js $SCRIPT_DIR/../*.sh
dos2unix $SCRIPT_DIR/../*.js $SCRIPT_DIR/../*.sh
dos2unix $SCRIPT_DIR/*.js $SCRIPT_DIR/*.sh

## run firstboot check
$SCRIPT_DIR/firstboot.sh

## set the initial heartbeat file (used by app.js and watchdog.js)
echo 0 > /tmp/heartbeat

$SCRIPT_DIR/callhome.sh booted

echo $(date) >> /srv/booted