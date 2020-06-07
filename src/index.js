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

import crypto from "crypto";
import Ripemd160 from "ripemd160";
import bech32 from "bech32";
import { publicKey, serializePath, signSendChunk } from "./helper";
import {
  APP_KEY,
  CHUNK_SIZE,
  CLA,
  INS,
  errorCodeToString,
  getVersion,
  getAppInfo,
  processErrorResponse,
  ERROR_CODE,
  P1_VALUES,
} from "./common";

const APP_NAME_TERRA = "Terra";
const APP_NAME_COSMOS = "Cosmos";
export default class TerraApp {
  constructor(transport) {
    if (!transport) {
      throw new Error("Transport has not been defined");
    }

    this.transport = transport;
  }

  static serializeHRP(hrp) {
    if (hrp == null || hrp.length < 3 || hrp.length > 83) {
      throw new Error("Invalid HRP");
    }
    const buf = Buffer.alloc(1 + hrp.length);
    buf.writeUInt8(hrp.length, 0);
    buf.write(hrp, 1);
    return buf;
  }

  static getBech32FromPK(hrp, pk) {
    if (pk.length !== 33) {
      throw new Error("expected compressed public key [31 bytes]");
    }
    const hashSha256 = crypto
      .createHash("sha256")
      .update(pk)
      .digest();
    const hashRip = new Ripemd160().update(hashSha256).digest();
    return bech32.encode(hrp, bech32.toWords(hashRip));
  }

  async initialize(scrambleKey = APP_KEY) {
    // Decroratet methods
    await Promise.all(
      ["getVersion", "sign", "getAddressAndPubKey", "appInfo", "deviceInfo", "getBech32FromPK"].map(
        async methodName => {
          this[methodName] = await this.transport.decorateAppAPIMethod(
            methodName,
            this[methodName],
            this,
            scrambleKey,
          );
        },
      ),
    );
  }

  async serializePath(path) {
    this.appInfoResponse = await getAppInfo(this.transport);
    if (this.appInfoResponse.return_code !== ERROR_CODE.NoError) {
      throw this.appInfoResponse;
    }

    const verisonSplit = this.appInfoResponse.appVersion.split(".");

    this.versionResponse = {};
    this.versionResponse.major = Number(verisonSplit[0]);
    this.versionResponse.minor = Number(verisonSplit[1]);
    this.versionResponse.patch = Number(verisonSplit[2]);

    if (
      (this.appInfoResponse.appName === APP_NAME_TERRA && this.versionResponse.major === 1) ||
      (this.appInfoResponse.appName === APP_NAME_COSMOS && this.versionResponse.major === 2)
    ) {
      return serializePath(path);
    }

    return {
      return_code: 0x6400,
      error_message: "App Version is not supported",
    };
  }

  async signGetChunks(path, message) {
    const serializedPath = await this.serializePath(path);

    const chunks = [];
    chunks.push(serializedPath);
    const buffer = Buffer.from(message);

    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      let end = i + CHUNK_SIZE;
      if (i > buffer.length) {
        end = buffer.length;
      }
      chunks.push(buffer.slice(i, end));
    }

    return chunks;
  }

  async getVersion() {
    try {
      this.versionResponse = await getVersion(this.transport);
      return this.versionResponse;
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async appInfo() {
    try {
      this.appInfoResponse = await getAppInfo(this.transport);
      return this.appInfoResponse;
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async deviceInfo() {
    return this.transport
      .send(0xe0, 0x01, 0, 0, Buffer.from([]), [ERROR_CODE.NoError, 0x6e00])
      .then(response => {
        const errorCodeData = response.slice(-2);
        const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

        if (returnCode === 0x6e00) {
          return {
            return_code: returnCode,
            error_message: "This command is only available in the Dashboard",
          };
        }

        const targetId = response.slice(0, 4).toString("hex");

        let pos = 4;
        const secureElementVersionLen = response[pos];
        pos += 1;
        const seVersion = response.slice(pos, pos + secureElementVersionLen).toString();
        pos += secureElementVersionLen;

        const flagsLen = response[pos];
        pos += 1;
        const flag = response.slice(pos, pos + flagsLen).toString("hex");
        pos += flagsLen;

        const mcuVersionLen = response[pos];
        pos += 1;
        // Patch issue in mcu version
        let tmp = response.slice(pos, pos + mcuVersionLen);
        if (tmp[mcuVersionLen - 1] === 0) {
          tmp = response.slice(pos, pos + mcuVersionLen - 1);
        }
        const mcuVersion = tmp.toString();

        return {
          return_code: returnCode,
          error_message: errorCodeToString(returnCode),
          // //
          targetId,
          seVersion,
          flag,
          mcuVersion,
        };
      }, processErrorResponse);
  }

  async publicKey(path) {
    try {
      const serializedPath = await this.serializePath(path);

      if (
        (this.appInfoResponse.appName === APP_NAME_TERRA && this.versionResponse.major === 1) ||
        (this.appInfoResponse.appName === APP_NAME_COSMOS && this.versionResponse.major === 2)
      ) {
        const data = Buffer.concat([TerraApp.serializeHRP("terra"), serializedPath]);
        return publicKey(this, data);
      }

      return {
        return_code: 0x6400,
        error_message: "App Version is not supported",
      };
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async getAddressAndPubKey(path, hrp) {
    try {
      return this.serializePath(path)
        .then(serializedPath => {
          const data = Buffer.concat([TerraApp.serializeHRP(hrp), serializedPath]);
          return this.transport
            .send(CLA, INS.GET_ADDR_SECP256K1, P1_VALUES.ONLY_RETRIEVE, 0, data, [ERROR_CODE.NoError])
            .then(response => {
              const errorCodeData = response.slice(-2);
              const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

              const compressedPk = Buffer.from(response.slice(0, 33));
              const bech32Address = Buffer.from(response.slice(33, -2)).toString();

              return {
                bech32_address: bech32Address,
                compressed_pk: compressedPk,
                return_code: returnCode,
                error_message: errorCodeToString(returnCode),
              };
            }, processErrorResponse);
        })
        .catch(err => processErrorResponse(err));
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async showAddressAndPubKey(path, hrp) {
    try {
      return this.serializePath(path)
        .then(serializedPath => {
          const data = Buffer.concat([TerraApp.serializeHRP(hrp), serializedPath]);
          return this.transport
            .send(CLA, INS.GET_ADDR_SECP256K1, P1_VALUES.SHOW_ADDRESS_IN_DEVICE, 0, data, [
              ERROR_CODE.NoError,
            ])
            .then(response => {
              const errorCodeData = response.slice(-2);
              const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

              const compressedPk = Buffer.from(response.slice(0, 33));
              const bech32Address = Buffer.from(response.slice(33, -2)).toString();

              return {
                bech32_address: bech32Address,
                compressed_pk: compressedPk,
                return_code: returnCode,
                error_message: errorCodeToString(returnCode),
              };
            }, processErrorResponse);
        })
        .catch(err => processErrorResponse(err));
    } catch (e) {
      return processErrorResponse(e);
    }
  }

  async signSendChunk(chunkIdx, chunkNum, chunk) {
    if (
      (this.appInfoResponse.appName === APP_NAME_TERRA && this.versionResponse.major === 1) ||
      (this.appInfoResponse.appName === APP_NAME_COSMOS && this.versionResponse.major === 2)
    ) {
      return signSendChunk(this, chunkIdx, chunkNum, chunk);
    }

    return {
      return_code: 0x6400,
      error_message: "App Version is not supported",
    };
  }

  async sign(path, message) {
    return this.signGetChunks(path, message).then(chunks => {
      return this.signSendChunk(1, chunks.length, chunks[0], [ERROR_CODE.NoError]).then(async response => {
        let result = {
          return_code: response.return_code,
          error_message: response.error_message,
          signature: null,
        };

        for (let i = 1; i < chunks.length; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          result = await this.signSendChunk(1 + i, chunks.length, chunks[i]);
          if (result.return_code !== ERROR_CODE.NoError) {
            break;
          }
        }

        return {
          return_code: result.return_code,
          error_message: result.error_message,
          // ///
          signature: result.signature,
        };
      }, processErrorResponse);
    }, processErrorResponse);
  }
}
