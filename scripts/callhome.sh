#!/bin/bash

home=$(cat /srv/home)
hostn=$(hostname)
ipaddr=$(hostname -I| sed 's/ *$//g'|tr ' ' ',')

url=https://$(echo $home/track?say=hello\&host="$hostn"\&ip="$ipaddr"|tr '\n' ' '|tr -d ' ')\&args=$1
curl --connect-timeout 10 --insecure $url
