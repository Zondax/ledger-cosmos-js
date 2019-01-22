/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2016-2017 Ledger
 *   (c) 2018 ZondaX GmbH
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/

'use strict';

let Q = require('q');

let LedgerApp = function (comm) {
    this.comm = comm;
    this.comm.setScrambleKey('CSM');
};

const CLA = 0x55;
const INS_GET_VERSION = 0x00;
const INS_PUBLIC_KEY_SECP256K1 = 0x01;
const INS_SIGN_SECP256K1 = 0x02;

const CHUNK_SIZE = 250;

function serialize(CLA, INS, p1 = 0, p2 = 0, data = null) {
    let size = 5;
    if (data != null) {
        if (data.length > 255) {
            throw new Error('maximum data size = 255');
        }
        size += data.length
    }
    let buffer = Buffer.alloc(size);

    buffer[0] = CLA;
    buffer[1] = INS;
    buffer[2] = p1;
    buffer[3] = p2;
    buffer[4] = 0;

    if (data != null) {
        buffer[4] = data.length;
        buffer.set(data, 5);
    }

    return buffer;
}

function errorMessage(error_code) {
    switch (error_code) {
        case 14:
            return "Timeout";
        case 0x9000:
            return "No errors";
        case 0x9001:
            return "Device is busy";
        case 0x6400:
            return "Execution Error";
        case 0x6700:
            return "Wrong Length";
        case 0x6982:
            return "Empty Buffer";
        case 0x6983:
            return "Output buffer too small";
        case 0x6984:
            return "Data is invalid";
        case 0x6985:
            return "Conditions not satisfied";
        case 0x6986:
            return "Command not allowed";
        case 0x6A80:
            return "Bad key handle";
        case 0x6B00:
            return "Invalid P1/P2";
        case 0x6D00:
            return "Instruction not supported";
        case 0x6E00:
            return "CLA not supported";
        case 0x6F00:
            return "Unknown error";
        case 0x6F01:
            return "Sign/verify error";
        default:
            return "Unknown error code";
    }
}


LedgerApp.prototype.get_version = function () {
    var buffer = serialize(CLA, INS_GET_VERSION, 0, 0);

    return this.comm.exchange(buffer.toString('hex'), [0x9000]).then(
        function (apduResponse) {
            var result = {};
            apduResponse = Buffer.from(apduResponse, 'hex');
            let error_code_data = apduResponse.slice(-2);

            result["test_mode"] = apduResponse[0] !== 0;
            result["major"] = apduResponse[1];
            result["minor"] = apduResponse[2];
            result["patch"] = apduResponse[3];

            result["return_code"] = error_code_data[0] * 256 + error_code_data[1];
            result["error_message"] = errorMessage(result["return_code"]);
            return result;
        },
        function (response) {
            let result = {};
            // Unfortunately, ledger returns an string!! :(
            result["return_code"] = parseInt(response.slice(-4), 16);
            result["error_message"] = errorMessage(result["return_code"]);
            return result;
        });
};

function serialize_path(path) {
    if (path == null || path.length < 3) {
        throw new Error("Invalid path.")
    }
    if (path.length > 10) {
        throw new Error("Invalid path. Length should be <= 10")
    }
    let buf = Buffer.alloc(1 + 4 * path.length);
    buf.writeUInt8(path.length);
    for (let i = 0; i < path.length; i++) {
        let v = path[i];
        if (i < 3) {
            v |= 0x80000000;    // Harden
        }
        buf.writeInt32LE(v, 1 + i * 4);
    }
    return buf;
};

LedgerApp.prototype.publicKey = function (path) {
    var buffer = serialize(CLA, INS_PUBLIC_KEY_SECP256K1, 0, 0, serialize_path(path));

    return this.comm.exchange(buffer.toString('hex'), [0x9000]).then(
        function (apduResponse) {
            var result = {};
            apduResponse = Buffer.from(apduResponse, 'hex');
            let error_code_data = apduResponse.slice(-2);

            result["pk"] = Buffer.from(apduResponse.slice(0, 65));
            result["return_code"] = error_code_data[0] * 256 + error_code_data[1];
            result["error_message"] = errorMessage(result["return_code"]);

            return result;
        },
        function (response) {
            let result = {};
            // Unfortunately, ledger returns an string!! :(
            result["return_code"] = parseInt(response.slice(-4), 16);
            result["error_message"] = errorMessage(result["return_code"]);
            return result;
        });
};

LedgerApp.prototype.sign_get_chunks = function (path, message) {
    let chunks = [];
    chunks.push(serialize_path(path));

    let buffer = Buffer.from(message);

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
        let end = i + CHUNK_SIZE;
        if (i > buffer.length) {
            end = buffer.length;
        }
        chunks.push(buffer.slice(i, end));
    }

    return chunks;
};

LedgerApp.prototype.sign_send_chunk = function (chunk_idx, chunk_num, chunk) {
    var buffer = serialize(CLA, INS_SIGN_SECP256K1, chunk_idx, chunk_num, chunk);

    return this.comm.exchange(buffer.toString('hex'), [0x9000]).then(
        function (apduResponse) {
            var result = {};
            apduResponse = Buffer.from(apduResponse, 'hex');
            let error_code_data = apduResponse.slice(-2);

            result["return_code"] = error_code_data[0] * 256 + error_code_data[1];
            result["error_message"] = errorMessage(result["return_code"]);

            result["signature"] = null;
            if (apduResponse.length > 2) {
                result["signature"] = apduResponse.slice(0, apduResponse.length - 2);
            }

            return result;
        },
        function (response) {
            let result = {};
            // Unfortunately, ledger returns an string!! :(
            result["return_code"] = parseInt(response.slice(-4), 16);
            result["error_message"] = errorMessage(result["return_code"]);
            return result;
        });
};

LedgerApp.prototype.sign = async function (path, message) {
    let myApp = this;
    let chunks = myApp.sign_get_chunks(path, message);

    return myApp.sign_send_chunk(1, chunks.length, chunks[0]).then(async function (result) {
        let response = {};

        response["return_code"] = result.return_code;
        response["error_message"] = result.error_message;
        response["signature"] = null;

        if (result.return_code === 0x9000) {
            for (let i = 1; i < chunks.length; i++) {
                result = await myApp.sign_send_chunk(1 + i, chunks.length, chunks[i]);
                response["return_code"] = result.return_code;
                response["error_message"] = result.error_message;
                if (result.return_code !== 0x9000) {
                    break;
                }
            }
            response["return_code"] = result.return_code;
            response["error_message"] = result.error_message;
            response["signature"] = result.signature;
        }

        return response;
    })
};

module.exports = LedgerApp;
