#! /bin/bash -eu

rm -r node_modules
npm install .
./node_modules/.bin/mocha test
node example/integrated.js