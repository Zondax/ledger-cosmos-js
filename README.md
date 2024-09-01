# @zondax/ledger-cosmos-js

![zondax_light](docs/zondax_light.png#gh-light-mode-only)
![zondax_dark](docs/zondax_dark.png#gh-dark-mode-only)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Main](https://github.com/cosmos/ledger-cosmos-js/workflows/Main/badge.svg)](https://github.com/cosmos/ledger-cosmos-js/actions?query=workflow%3AMain)
[![npm version](https://badge.fury.io/js/%40cosmos%2Fledger-cosmos-js.svg)](https://badge.fury.io/js/%40cosmos%2Fledger-cosmos-js)

This package provides a basic client library to communicate with a Tendermint/Cosmos App running in a Ledger Nano S/S+/X devices

We recommend using the npmjs package in order to receive updates/fixes.

# Available commands

| Operation            | Response                    | Command                     |
|----------------------|-----------------------------|-----------------------------|
| getVersion           | app version                 | ---------------             |
| publicKey            | pubkey                      | path (legacy command)       |
| getAddressAndPubKey  | pubkey + address            | path + ( showInDevice )     |
| showAddressAndPubKey | signed message              | path                        |
| appInfo              | name, version, flags, etc   | ---------------             |
| deviceInfo           | fw and mcu version, id, etc | Only available in dashboard |
| sign                 | signed message              | path + message + (HRP)      |

getAddress command requires that you set the derivation path (account, change, index) and has an option parameter to display the address on the device. By default, it will retrieve the information without user confirmation.

# Testing with real devices

It is possible to test this package with a real Ledger Nano device. To accomplish that, you will need to follow these steps:

- Install the application in the Ledger device
- Install the dependencies from this project
- Run tests

```shell script
yarn install
yarn test:integration
```

# Who we are?

We are Zondax, a company pioneering blockchain services. If you want to know more about us, please visit us at [zondax.ch](https://zondax.ch)
