#! /bin/bash -eu

if [[ -f config/env.sh ]] ;
. config/env.sh
fi
exec node coordinator.js
