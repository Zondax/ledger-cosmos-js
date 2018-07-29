# ledger-cosmos-js

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

This package provides a basic client library to communicate with a Tendermint/Cosmos App running in a Ledger Nano S

There are two running modes:

- *HID*: Direct access via HID. This can be used from a backend, node.js, etc.
- *U2F*: This allows access to the device from the browser (client side)

# Testing

Install all dependencies by running

```
npm install
``` 

There are a few useful scripts:

- ```npm test```: Will run HID tests

- ```npm browserify```: Will generate js files that are necessary for U2F/browser integration
 
- ```npm test-browserify```: Will generate js files that are necessary for browser testing. After executing this script. You can access `tests/browser/index.html` to run browser tests. 

Warning: You need to setup a webserver and point it to index.html. U2F communication requires an https connection.
 
