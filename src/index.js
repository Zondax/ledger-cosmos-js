/** ******************************************************************************
 *  (c) 2019 ZondaX GmbH
 *  (c) 2016-2017 Ledger
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
 ******************************************************************************* */

import Transport from '@ledgerhq/hw-transport';
import { TransportStatusError } from '@ledgerhq/hw-transport';

const CLA = 0x55;
const CHUNK_SIZE = 250;

const INS = {
    GET_VERSION: 0x00,
    PUBLIC_KEY_SECP256K1: 0x01,
    SIGN_SECP256K1: 0x02,
    SHOW_ADDR_SECP256K1: 0x03,
    GET_ADDR_SECP256K1: 0x04,
};

function errorMessage(error_code) {
    switch (error_code) {
        case 1:
            return "U2F: Unknown";
        case 2:
            return "U2F: Bad request";
        case 3:
            return "U2F: Configuration unsupported";
        case 4:
            return "U2F: Device Ineligible";
        case 5:
            return "U2F: Timeout";
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
            return "Transaction rejected";
        case 0x6A80:
            return "Bad key handle";
        case 0x6B00:
            return "Invalid P1/P2";
        case 0x6D00:
            return "Instruction not supported";
        case 0x6E00:
            return "Cosmos app does not seem to be open";
        case 0x6F00:
            return "Unknown error";
        case 0x6F01:
            return "Sign/verify error";
        default:
            return "Unknown error code";
    }
}

function processErrorResponse(response) {
    let result = {};

    // TODO: Do we still need this?
    if (typeof response === 'string' || response instanceof String) {
        // Unfortunately, ledger node implementation returns an string!! :(
        result["return_code"] = parseInt(response.slice(-4), 16);
    } else {
        // Handle U2F communication normally
        result["return_code"] = response.errorCode;
    }

    result["error_message"] = errorMessage(result["return_code"]);

    return result;
}

function serialize_hrp(hrp) {
    if (hrp == null || hrp.length < 3 || hrp.length > 83) {
        throw new Error("Invalid HRP")
    }
    let buf = Buffer.alloc(1 + hrp.length);
    buf.writeUInt8(hrp.length, 0);
    buf.write(hrp, 1);
    return buf;
}

function serialize_path(path) {
    if (path == null || path.length < 3) {
        throw new Error("Invalid path.")
    }
    if (path.length > 10) {
        throw new Error("Invalid path. Length should be <= 10")
    }
    let buf = Buffer.alloc(1 + 4 * path.length);
    buf.writeUInt8(path.length, 0);
    for (let i = 0; i < path.length; i++) {
        let v = path[i];
        if (i < 3) {
            v |= 0x80000000;    // Harden
        }
        buf.writeInt32LE(v, 1 + i * 4);
    }
    return buf;
}

function compressPublicKey(publicKey) {
    if (publicKey.length !== 65) {
        throw new Error('decompressed public key length should be 65 bytes');
    }
    const y = publicKey.slice(33, 65);
    const z = new Buffer.from([2 + (y[y.length - 1] & 1)]);
    return Buffer.concat([z, publicKey.slice(1, 33)]);
}

export default class CosmosApp {
    constructor(transport, scrambleKey = 'CSM') {
        if (typeof transport == 'undefined') {
            throw new Error('Transport has not been defined');
        }

        this.transport = transport;
        transport.decorateAppAPIMethods(
            this,
            [
                'getVersion',
                'publicKey',
                'sign',
                'getAddressAndPubKey',
                'appInfo',
                'deviceInfo',
                'getBech32FromPK'
            ],
            scrambleKey,
        );
    }

    async getVersion() {
        return this.transport.send(CLA, INS.GET_VERSION, 0, 0)
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
                    return {
                        test_mode: response[0] !== 0,
                        major: response[1],
                        minor: response[2],
                        patch: response[3],
                        device_locked: response[4] === 1,
                        return_code: returnCode,
                        error_message: errorMessage(returnCode)
                    };
                },
                processErrorResponse
            );
    }

    async publicKey(path) {
        path = serialize_path(path);
        return this.transport.send(CLA, INS.PUBLIC_KEY_SECP256K1, 0, 0, path)
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
                    let pk = Buffer.from(response.slice(0, 65));
                    return {
                        pk: pk,
                        compressed_pk: compressPublicKey(pk),
                        return_code: returnCode,
                        error_message: errorMessage(returnCode)
                    };
                },
                processErrorResponse
            );
    };

    // async getAddress(account, change, addressIndex) {
    //     const bip44Path = MatrixAIApp.serializeMANBIP44(account, change, addressIndex);
    //     return this.transport.send(CLA, INS.GETADDR_SECP256K1, 0, 0, bip44Path)
    //         .then(
    //             (response) => {
    //                 const errorCodeData = response.slice(-2);
    //                 return {
    //                     pubKey: response.slice(0, 65)
    //                         .toString('hex'),
    //                     address: response.slice(65, 97)
    //                         .toString('ascii'),
    //                     return_code: errorCodeData[0] * 256 + errorCodeData[1],
    //                     // TODO: Improve error handle
    //                     // TODO: Unify error messages
    //                     error_message: '????',
    //                 };
    //             },
    //             processErrorResponse
    //         );
    // }

    getBech32FromPK(hrp, pk) {
        if (pk.length !== 33) {
            throw new Error("expected compressed public key [31 bytes]");
        }
        const tmp = crypto.enc.Hex.parse(pk.toString("hex"));
        const hash = ripemd160(sha256(tmp)).toString();
        const address = Buffer.from(hash, "hex");
        return bech32.encode(hrp, bech32.toWords(address));
    };

}
