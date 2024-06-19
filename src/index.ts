/** ******************************************************************************
 *  (c) 2018 - 2023 Zondax AG
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
import { ResponseSign, type ResponseAddress, type ResponsePubkey } from "./types";
import { CLA, P1_VALUES, P2_VALUES, PKLEN } from "./consts";
import type Transport from "@ledgerhq/hw-transport";
import BaseApp, {
  INSGeneric,
  LedgerError,
  PAYLOAD_TYPE,
  ResponsePayload,
  processErrorResponse,
  processResponse,
} from "@zondax/ledger-js";

const crypto = require("crypto");
const bech32 = require("bech32");
const Ripemd160 = require("ripemd160");

export default class CosmosApp extends BaseApp {
  static _INS = {
    GET_VERSION: 0x00 as number,
    SIGN_SECP256K1: 0x02 as number,
    GET_ADDR_SECP256K1: 0x04 as number,
  };

  static _params = {
    cla: CLA,
    ins: { ...CosmosApp._INS } as INSGeneric,
    p1Values: { ONLY_RETRIEVE: 0x00 as 0, SHOW_ADDRESS_IN_DEVICE: 0x01 as 1 },
    chunkSize: 250,
    requiredPathLengths: [5],
  };

  /**
   * Constructs a new CosmosApp instance.
   * @param transport - The transport instance.
   * @throws {Error} - If the transport is not defined.
   */
  constructor(transport: Transport) {
    super(transport, CosmosApp._params);

    if (!this.transport) {
      throw new Error("Transport has not been defined");
    }
  }

  private serializeHRP(hrp: string) {
    if (hrp == null || hrp.length < 3 || hrp.length > 83) {
      throw new Error("Invalid HRP");
    }
    const buf = Buffer.alloc(1 + hrp.length);
    buf.writeUInt8(hrp.length, 0);
    buf.write(hrp, 1);
    return buf;
  }

  async publicKey(path: string): Promise<ResponsePubkey> {
    const serializedPath = await this.serializePath(path);
    const data = Buffer.concat([this.serializeHRP("cosmos"), serializedPath]);

    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_ADDR_SECP256K1, 0, 0, data);
      const response = processResponse(responseBuffer);
      const compressed_pk = Buffer.from(response.readBytes(PKLEN));

      return {
        compressed_pk,
      } as ResponsePubkey;
    } catch (e) {
      throw processErrorResponse(e);
    }
  }

  async getAddressAndPubKey(path: string, hrp: string): Promise<ResponseAddress> {
    try {
      const serializedPath = await this.serializePath(path);
      const data = Buffer.concat([this.serializeHRP(hrp), serializedPath]);

      const responseBuffer = await this.transport.send(
        this.CLA,
        this.INS.GET_ADDR,
        P1_VALUES.ONLY_RETRIEVE,
        0,
        data,
      );

      const response = processResponse(responseBuffer);
      const compressed_pk = Buffer.from(response.readBytes(PKLEN));
      const bech32_address = Buffer.from(response.readBytes(response.length())).toString();

      return {
        compressed_pk,
        bech32_address,
      } as ResponseAddress;
    } catch (e) {
      throw processErrorResponse(e);
    }
  }

  async showAddressAndPubKey(path: string, hrp: string): Promise<ResponseAddress> {
    const serializedPath = await this.serializePath(path);
    const data = Buffer.concat([this.serializeHRP(hrp), serializedPath]);

    try {
      const responseBuffer = await this.transport.send(
        this.CLA,
        this.INS.GET_ADDR,
        P1_VALUES.SHOW_ADDRESS_IN_DEVICE,
        0,
        data,
      );

      const response = processResponse(responseBuffer);

      const compressed_pk = Buffer.from(response.readBytes(PKLEN));
      const bech32_address = Buffer.from(response.readBytes(response.length())).toString();

      return {
        compressed_pk,
        bech32_address,
      } as ResponseAddress;
    } catch (e) {
      throw processErrorResponse(e);
    }
  }

  static getBech32FromPK(hrp: string, pk: Buffer) {
    if (pk.length !== 33) {
      throw new Error("expected compressed public key [31 bytes]");
    }
    const hashSha256 = crypto.createHash("sha256").update(pk).digest();
    const hashRip = new Ripemd160().update(hashSha256).digest();
    return bech32.encode(hrp, bech32.toWords(hashRip));
  }

  async prepareChunks_hrp(path: string, buffer: Buffer, hrp: string | undefined) {
    const serializedPath = await this.serializePath(path);
    const firstChunk =
      hrp === undefined ? serializedPath : Buffer.concat([serializedPath, this.serializeHRP(hrp)]);

    const chunks = [];
    chunks.push(firstChunk);

    for (let i = 0; i < buffer.length; i += this.CHUNK_SIZE) {
      let end = i + this.CHUNK_SIZE;
      if (i > buffer.length) {
        end = buffer.length;
      }
      chunks.push(buffer.subarray(i, end));
    }

    return chunks;
  }

  async signSendCosmosChunk(
    chunkIdx: number,
    chunkNum: number,
    chunk: Buffer,
    txtype = P2_VALUES.JSON,
  ): Promise<ResponsePayload> {
    let payloadType = PAYLOAD_TYPE.ADD;
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT;
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST;
    }

    const statusList = [LedgerError.NoErrors, LedgerError.DataIsInvalid, LedgerError.BadKeyHandle];

    const responseBuffer = await this.transport.send(
      this.CLA,
      this.INS.SIGN_SECP256K1,
      payloadType,
      txtype,
      chunk,
      statusList,
    );
    const response = processResponse(responseBuffer);

    return response;
  }

  private async signImpl(
    path: string,
    buffer: Buffer,
    hrp: string | undefined,
    txtype: number,
  ): Promise<ResponseSign> {
    const chunks = await this.prepareChunks_hrp(path, buffer, hrp);

    try {
      let result = await this.signSendCosmosChunk(1, chunks.length, chunks[0], txtype);

      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.signSendCosmosChunk(1 + i, chunks.length, chunks[i], txtype);
      }

      return {
        signature: result.readBytes(result.length()),
      };
    } catch (e) {
      throw processErrorResponse(e);
    }
  }

  async sign(path: string, buffer: Buffer, hrp: string | undefined, txtype: number): Promise<ResponseSign> {
    return await this.signImpl(path, buffer, hrp, txtype);
  }
}
