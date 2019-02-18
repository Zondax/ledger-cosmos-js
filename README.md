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
 
- ```npm browserify-test```: Will generate js files that are necessary for browser testing. After executing this script. You can access `tests/browser/index.html` to run browser tests. 

Warning: You need to setup a webserver and point it to index.html. U2F communication requires an https connection.

## How to run browser tests

First you need to deploy the javascript files. Run the following: 

```bash
npm run browserify
npm run browserify-test
```

now go to the test directory and run `caddy`
```bash
cd tests/browser
caddy
```

you should see something like:

```text
Activating privacy features... done.
https://localhost:2020
WARNING: File descriptor limit 1024 is too low for production servers. At least 8192 is recommended. Fix with `ulimit -n 8192`.
```

Open your browser at `https://localhost:2020` and you can now run the test