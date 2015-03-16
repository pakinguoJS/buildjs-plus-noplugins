#!/bin/bash
cwd="$(pwd)/bjs.conf.js"
if [ -f $cwd ]
then
    nohup bjs watch > _log.out &
    echo "[Success]: bjs watch on '$(pwd)' is started."
else
    echo '[Error]: bjs.conf.js is required!'
fi
