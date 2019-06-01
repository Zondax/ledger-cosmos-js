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
import crypto from 'crypto';
import Ripemd160 from 'ripemd160';
import bech32 from 'bech32';

const CLA = 0x55;
const CHUNK_SIZE = 250;

const INS = {
    GET_VERSION: 0x00,
    PUBLIC_KEY_SECP256K1: 0x01,
    SIGN_SECP256K1: 0x02,
    SHOW_ADDR_SECP256K1: 0x03,
    GET_ADDR_SECP256K1: 0x04,
};

const ERROR_DESCRIPTION = {
    1: "U2F: Unknown",
    2: "U2F: Bad request",
    3: "U2F: Configuration unsupported",
    4: "U2F: Device Ineligible",
    5: "U2F: Timeout",
    14: "Timeout",
    0x9000: "No errors",
    0x9001: "Device is busy",
    0x6400: "Execution Error",
    0x6700: "Wrong Length",
    0x6982: "Empty Buffer",
    0x6983: "Output buffer too small",
    0x6984: "Data is invalid",
    0x6985: "Conditions not satisfied",
    0x6986: "Transaction rejected",
    0x6A80: "Bad key handle",
    0x6B00: "Invalid P1/P2",
    0x6D00: "Instruction not supported",
    0x6E00: "Cosmos app does not seem to be open",
    0x6F00: "Unknown error",
    0x6F01: "Sign/verify error",
};

function errorCodeToString(statusCode) {
    if (statusCode in ERROR_DESCRIPTION)
        return ERROR_DESCRIPTION[statusCode];
    return `Unknown Status Code: ${statusCode}`
}

export function getBech32FromPK(hrp, pk) {
    if (pk.length !== 33) {
        throw new Error("expected compressed public key [31 bytes]");
    }
    const hash_sha256 = crypto.createHash('sha256').update(pk).digest();
    const hash_rip = new Ripemd160().update(hash_sha256).digest();
    return bech32.encode(hrp, bech32.toWords(hash_rip));
}

function processErrorResponse(response) {
    return {
        return_code: response.statusCode,
        error_message: errorCodeToString(response.statusCode)
    };
}

function serializeHRP(hrp) {
    if (hrp == null || hrp.length < 3 || hrp.length > 83) {
        throw new Error("Invalid HRP")
    }
    let buf = Buffer.alloc(1 + hrp.length);
    buf.writeUInt8(hrp.length, 0);
    buf.write(hrp, 1);
    return buf;
}

function serializePath(path) {
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

export function signGetChunks(path, message) {
    let chunks = [];
    chunks.push(serializePath(path));

    let buffer = Buffer.from(message);

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
        let end = i + CHUNK_SIZE;
        if (i > buffer.length) {
            end = buffer.length;
        }
        chunks.push(buffer.slice(i, end));
    }

    return chunks;
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
                        return_code: returnCode,
                        error_message: errorCodeToString(returnCode),
                        /////
                        test_mode: response[0] !== 0,
                        major: response[1],
                        minor: response[2],
                        patch: response[3],
                        device_locked: response[4] === 1
                    };
                },
                processErrorResponse
            );
    }

    async appInfo() {
        return this.transport.send(0xB0, 0x01, 0, 0)
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

                    let appName = "err";
                    let appVersion = "err";
                    let flagLen = 0;
                    let flagsValue = 0;

                    if (response[0] !== 1) {
                        // Ledger responds with format ID 1. There is no spec for any format != 1
                        result["error_message"] = "response format ID not recognized";
                        result.return_code = 0x9001;
                    } else {
                        const appNameLen = response[1];
                        appName = response.slice(2, 2 + appNameLen).toString('ascii');
                        var idx = 2 + appNameLen;
                        const appVersionLen = response[idx];
                        idx++;
                        appVersion = response.slice(idx, idx + appVersionLen).toString('ascii');
                        idx += appVersionLen;
                        const appFlagsLen = response[idx];
                        idx++;
                        flagLen = appFlagsLen;
                        flagsValue = response[idx];
                    }

                    return {
                        return_code: returnCode,
                        error_message: errorCodeToString(returnCode),
                        ////
                        appName: appName,
                        appVersion: appVersion,
                        flagLen: flagLen,
                        flagsValue: flagsValue,
                        flag_recovery: (flagsValue & 1) !== 0,
                        flag_signed_mcu_code: (flagsValue & 2) !== 0,
                        flag_onboarded: (flagsValue & 4) !== 0,
                        flag_pin_validated: (flagsValue & 128) !== 0
                    };
                },
                processErrorResponse
            );
    }

    async deviceInfo() {
        return this.transport.send(0xE0, 0x01, 0, 0, Buffer.from([]), [0x9000, 0x6E00])
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

                    if (returnCode === 0x6E00) {
                        return {
                            return_code: returnCode,
                            error_message: "This command is only available in the Dashboard",
                        }
                    }

                    const targetId = response.slice(0, 4).toString('hex');

                    let pos = 4;
                    const secureElementVersionLen = response[pos++];
                    const seVersion = response.slice(pos, pos + secureElementVersionLen).toString();
                    pos += secureElementVersionLen;

                    const flagsLen = response[pos++];
                    const flag = response.slice(pos, pos + flagsLen).toString('hex');
                    pos += flagsLen;

                    const mcuVersionLen = response[pos++];
                    // Patch issue in mcu version
                    let tmp = response.slice(pos, pos + mcuVersionLen);
                    if (tmp[mcuVersionLen - 1] === 0) {
                        tmp = response.slice(pos, pos + mcuVersionLen - 1);
                    }
                    const mcuVersion = tmp.toString();

                    return {
                        return_code: returnCode,
                        error_message: errorCodeToString(returnCode),
                        ////
                        targetId: targetId,
                        seVersion: seVersion,
                        flag: flag,
                        mcuVersion: mcuVersion,
                    };
                }
                ,
                processErrorResponse
            );
    }

    async publicKey(path) {
        path = serializePath(path);
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
                        error_message: errorCodeToString(returnCode)
                    };
                },
                processErrorResponse
            );
    };

    async getAddressAndPubKey(path, hrp) {
        let data = Buffer.concat([serializeHRP(hrp), serializePath(path)]);
        return this.transport.send(CLA, INS.GET_ADDR_SECP256K1, 0, 0, data, [0x9000])
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

                    let compressedPk = Buffer.from(response.slice(0, 33));
                    let bech32Address = Buffer.from(response.slice(33, -2)).toString();

                    let pk = Buffer.from(response.slice(0, 65));
                    return {
                        bech32_address: bech32Address,
                        compressed_pk: compressedPk,
                        return_code: returnCode,
                        error_message: errorCodeToString(returnCode)
                    };
                },
                processErrorResponse
            );
    };

    async sign_send_chunk(chunk_idx, chunk_num, chunk) {
        return this.transport.send(CLA, INS.SIGN_SECP256K1, chunk_idx, chunk_num, chunk, [0x9000, 0x6A80])
            .then(
                (response) => {
                    const errorCodeData = response.slice(-2);
                    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];
                    let errorMessage = errorCodeToString(returnCode);

                    if (returnCode === 0x6A80) {
                        errorMessage = response.slice(0, response.length - 2).toString('ascii');
                    }

                    let signature = null;
                    if (response.length > 2) {
                        signature = response.slice(0, response.length - 2);
                    }

                    return {
                        signature: signature,
                        return_code: returnCode,
                        error_message: errorMessage
                    };
                },
                processErrorResponse
            );
    };

    async sign(path, message) {
        let chunks = signGetChunks(path, message);
        return this.sign_send_chunk(1, chunks.length, chunks[0], [0x9000])
            .then(
                async (result) => {
                    for (let i = 1; i < chunks.length; i++) {
                        result = await this.sign_send_chunk(1 + i, chunks.length, chunks[i]);
                        if (result.return_code !== 0x9000) {
                            break;
                        }
                    }

                    return {
                        return_code: result.return_code,
                        error_message: result.error_message,
                        /////
                        signature: result.signature,
                    };
                },
                processErrorResponse
            );
    };
}
