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

import * as crypto from "crypto";
import * as Ripemd160 from "ripemd160";
import * as bech32 from "bech32";
import {
  publicKey,
  serializePath,
  sign,
  getVersion,
  getAppInfo,
  getDeviceInfo,
  getAddressAndPubKey,
  showAddressAndPubKey,
} from "./helper";
import {
  CommonResponse,
  AppInfoResponse,
  VersionResponse,
  processErrorResponse,
  APP_KEY,
} from "./common";

const APP_NAME_TERRA = "Terra";
const APP_NAME_COSMOS = "Cosmos";

export default class TerraApp {
  private transport;
  private appInfo: AppInfoResponse;
  version: VersionResponse;

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
    const hashSha256 = crypto.createHash("sha256").update(pk).digest();
    const hashRip = new Ripemd160().update(hashSha256).digest();
    return bech32.encode(hrp, bech32.toWords(hashRip));
  }

  async initialize(scrambleKey = APP_KEY): Promise<void | CommonResponse> {
    // Decorate methods
    const methods = ["getVersion", "sign", "getAddressAndPubKey", "appInfo", "deviceInfo", "getBech32FromPK"];

    for (let methodName of methods) {
      this[methodName] = await this.transport.decorateAppAPIMethod(
        methodName,
        this[methodName],
        this,
        scrambleKey,
      );
    }

    return getAppInfo(this.transport)
      .then((appInfo) => {
        this.appInfo = appInfo;
        return getVersion(this.transport);
      })
      .then((version) => {
        this.version = version;
      });
  }

  validateCompatibility(): CommonResponse | null {
    if (
      this.appInfo &&
      this.version &&
      ((this.appInfo.app_name === APP_NAME_TERRA && this.version.major === 1) ||
        (this.appInfo.app_name === APP_NAME_COSMOS && this.version.major === 2))
    ) {
      return null;
    }

    return {
      return_code: 0x6400,
      error_message: "App Version is not supported",
    };
  }

  serializePath(path): CommonResponse | Buffer {
    return this.validateCompatibility() || serializePath(path);
  }

  getVersion() {
    return this.version;
  }

  getDeviceInfo() {
    return getDeviceInfo(this.transport).catch(processErrorResponse);
  }

  getPublicKey(path) {
    const result = this.serializePath(path);

    if (!(result instanceof Buffer)) {
      return result;
    }

    const data = Buffer.concat([TerraApp.serializeHRP("terra"), result]);
    return publicKey(this.transport, data).catch(processErrorResponse);
  }

  getAddressAndPubKey(path, hrp) {
    const result = this.serializePath(path);

    if (!(result instanceof Buffer)) {
      return result;
    }

    const data = Buffer.concat([TerraApp.serializeHRP(hrp), result]);
    return getAddressAndPubKey(this.transport, data).catch(processErrorResponse);
  }

  showAddressAndPubKey(path, hrp) {
    const result = this.serializePath(path);

    if (!(result instanceof Buffer)) {
      return result;
    }

    const data = Buffer.concat([TerraApp.serializeHRP(hrp), result]);
    return showAddressAndPubKey(this.transport, data).catch(processErrorResponse);
  }

  sign(path, message) {
    const result = this.validateCompatibility();

    if (result) {
      return result;
    }

    return sign(this.transport, path, message).catch(processErrorResponse);
  }
}
