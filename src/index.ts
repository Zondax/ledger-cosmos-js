/** ******************************************************************************
 *  (c) Zondax AG
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
import type Transport from '@ledgerhq/hw-transport'
import BaseApp, {
  HARDENED,
  INSGeneric,
  LedgerError,
  PAYLOAD_TYPE,
  ResponseError,
  ResponsePayload,
  processErrorResponse,
  processResponse,
} from '@zondax/ledger-js'
import { ByteStream } from '@zondax/ledger-js/dist/byteStream'

import { CLA, P1_VALUES, P2_VALUES, PKLEN } from './consts'
import { type ResponseAddress, type ResponsePubkey, ResponseSign } from './types'

import { ripemd160 } from '@noble/hashes/ripemd160'
import { sha256 } from '@noble/hashes/sha256'
import { bech32 } from '@scure/base'

export default class CosmosApp extends BaseApp {
  static _INS = {
    GET_VERSION: 0x00 as number,
    SIGN_SECP256K1: 0x02 as number,
    GET_ADDR_SECP256K1: 0x04 as number,
  }

  static _params = {
    cla: CLA,
    ins: { ...CosmosApp._INS } as INSGeneric,
    p1Values: { ONLY_RETRIEVE: 0x00 as 0, SHOW_ADDRESS_IN_DEVICE: 0x01 as 1 },
    chunkSize: 250,
    requiredPathLengths: [5],
  }

  /**
   * Constructs a new CosmosApp instance.
   * @param transport - The transport instance.
   * @throws {Error} - If the transport is not defined.
   */
  constructor(transport: Transport) {
    super(transport, CosmosApp._params)

    if (!this.transport) {
      throw new Error('Transport has not been defined')
    }
  }

  private serializeHRP(hrp: string) {
    if (hrp == null || hrp.length < 3 || hrp.length > 83) {
      throw new Error('Invalid HRP')
    }

    const buf = new ByteStream()
    buf.appendUint8(hrp.length)
    buf.appendBytes(Buffer.from(hrp))

    return buf.getCompleteBuffer()
  }

  private serializeCosmosPath(path: string) {
    if (typeof path !== 'string') {
      // NOTE: this is probably unnecessary
      throw new ResponseError(LedgerError.GenericError, "Path should be a string (e.g \"m/44'/461'/5'/0/3\")")
    }

    if (!path.startsWith('m/')) {
      throw new ResponseError(LedgerError.GenericError, 'Path should start with "m/" (e.g "m/44\'/461\'/5\'/0/3")')
    }

    const pathArray = path.split('/')
    pathArray.shift() // remove "m"

    if (this.REQUIRED_PATH_LENGTHS && this.REQUIRED_PATH_LENGTHS.length > 0 && !this.REQUIRED_PATH_LENGTHS.includes(pathArray.length)) {
      throw new ResponseError(LedgerError.GenericError, "Invalid path length. (e.g \"m/44'/5757'/5'/0/3\")")
    }

    const buf = new ByteStream()
    pathArray.forEach((child: string) => {
      let value = 0

      if (child.endsWith("'")) {
        value += HARDENED
        child = child.slice(0, -1)
      }

      const numChild = Number(child)

      if (Number.isNaN(numChild)) {
        throw new ResponseError(LedgerError.GenericError, `Invalid path : ${child} is not a number. (e.g "m/44'/461'/5'/0/3")`)
      }
      value += numChild
      buf.appendUint32(value)
    })

    return buf.getCompleteBuffer()
  }

  async publicKey(path: string): Promise<ResponsePubkey> {
    const serializedPath = this.serializeCosmosPath(path)
    const data = Buffer.concat([this.serializeHRP('cosmos'), serializedPath])

    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_ADDR_SECP256K1, 0, 0, data)
      const response = processResponse(responseBuffer)
      const compressed_pk = Buffer.from(response.readBytes(PKLEN))

      return {
        compressed_pk,
      } as ResponsePubkey
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async getAddressAndPubKey(path: string, hrp: string): Promise<ResponseAddress> {
    const serializedPath = this.serializeCosmosPath(path)
    const data = Buffer.concat([this.serializeHRP(hrp), serializedPath])

    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_ADDR_SECP256K1, P1_VALUES.ONLY_RETRIEVE, 0, data)

      const response = processResponse(responseBuffer)
      const compressed_pk = response.readBytes(PKLEN)
      const bech32_address = response.readBytes(response.length()).toString()

      return {
        compressed_pk,
        bech32_address,
      } as ResponseAddress
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async showAddressAndPubKey(path: string, hrp: string): Promise<ResponseAddress> {
    const serializedPath = this.serializeCosmosPath(path)
    const data = Buffer.concat([this.serializeHRP(hrp), serializedPath])

    try {
      const responseBuffer = await this.transport.send(this.CLA, this.INS.GET_ADDR_SECP256K1, P1_VALUES.SHOW_ADDRESS_IN_DEVICE, 0, data)

      const response = processResponse(responseBuffer)
      const compressed_pk = response.readBytes(PKLEN)
      const bech32_address = response.readBytes(response.length()).toString()

      return {
        compressed_pk,
        bech32_address,
      } as ResponseAddress
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  static getBech32FromPK(hrp: string, pk: Buffer) {
    if (pk.length !== 33) {
      throw new Error('expected compressed public key [31 bytes]')
    }
    const hashSha256 = sha256(pk)
    const hashRip = ripemd160(hashSha256)
    return bech32.encode(hrp, bech32.toWords(hashRip))
  }

  async prepareChunks_hrp(path: string, buffer: Buffer, hrp: string | undefined) {
    const serializedPath = this.serializeCosmosPath(path)
    const firstChunk = hrp === undefined ? serializedPath : Buffer.concat([serializedPath, this.serializeHRP(hrp)])

    const chunks = []
    chunks.push(firstChunk)

    for (let i = 0; i < buffer.length; i += this.CHUNK_SIZE) {
      let end = i + this.CHUNK_SIZE
      if (i > buffer.length) {
        end = buffer.length
      }
      chunks.push(buffer.subarray(i, end))
    }

    return chunks
  }

  async signSendCosmosChunk(chunkIdx: number, chunkNum: number, chunk: Buffer, txtype = P2_VALUES.JSON): Promise<ResponsePayload> {
    let payloadType = PAYLOAD_TYPE.ADD
    if (chunkIdx === 1) {
      payloadType = PAYLOAD_TYPE.INIT
    }
    if (chunkIdx === chunkNum) {
      payloadType = PAYLOAD_TYPE.LAST
    }

    const statusList = [LedgerError.NoErrors, LedgerError.DataIsInvalid, LedgerError.BadKeyHandle]

    const responseBuffer = await this.transport.send(this.CLA, this.INS.SIGN_SECP256K1, payloadType, txtype, chunk, statusList)
    const response = processResponse(responseBuffer)

    return response
  }

  private async signImpl(path: string, buffer: Buffer, hrp: string | undefined, txtype: number): Promise<ResponseSign> {
    const chunks = await this.prepareChunks_hrp(path, buffer, hrp)

    try {
      let result = await this.signSendCosmosChunk(1, chunks.length, chunks[0], txtype)

      for (let i = 1; i < chunks.length; i += 1) {
        result = await this.signSendCosmosChunk(1 + i, chunks.length, chunks[i], txtype)
      }

      return {
        signature: result.readBytes(result.length()),
      }
    } catch (e) {
      throw processErrorResponse(e)
    }
  }

  async sign(path: string, buffer: Buffer, hrp: string | undefined, txtype = P2_VALUES.JSON): Promise<ResponseSign> {
    return await this.signImpl(path, buffer, hrp, txtype)
  }
}
