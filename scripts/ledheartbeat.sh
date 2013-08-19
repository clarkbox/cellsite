#!/bin/bash

if[$1==1]
    echo heartbeat >/sys/class/leds/led0/trigger
else
    echo none >/sys/class/leds/led0/trigger
fi