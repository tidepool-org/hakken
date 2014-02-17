#! /bin/bash -eu

if [[ -f config/env.sh ]];
then
  . config/env.sh
fi
exec node coordinator.js
