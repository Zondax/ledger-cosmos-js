/** ******************************************************************************
 *  (c) 2018 - 2022 Zondax AG
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
import { signSendChunkv1 } from './commandsV1'
import { CLA, ERROR_CODE, errorCodeToString, INS, PAYLOAD_TYPE, processErrorResponse, P2_VALUES } from './common'

export function serializePathv2(path: number[]) {
  if (!path || path.length !== 5) {
    throw new Error('Invalid path.')
  }

  const buf = Buffer.alloc(20)
  buf.writeUInt32LE(0x80000000 + path[0], 0)
  buf.writeUInt32LE(0x80000000 + path[1], 4)
  buf.writeUInt32LE(0x80000000 + path[2], 8)
  buf.writeUInt32LE(path[3], 12)
  buf.writeUInt32LE(path[4], 16)

  return buf
}

export async function signSendChunkv2(app: any, chunkIdx: number, chunkNum: number, chunk: Buffer, txType = P2_VALUES.JSON) {
  let payloadType = PAYLOAD_TYPE.ADD
  if (chunkIdx === 1) {
    payloadType = PAYLOAD_TYPE.INIT
  }
  if (chunkIdx === chunkNum) {
    payloadType = PAYLOAD_TYPE.LAST
  }

  return signSendChunkv1(app, payloadType, 0, chunk, txType)
}

export async function publicKeyv2(app: any, data: Buffer) {
  return app.transport.send(CLA, INS.GET_ADDR_SECP256K1, 0, 0, data, [ERROR_CODE.NoError]).then((response: any) => {
    const errorCodeData = response.slice(-2)
    const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
    const compressedPk = Buffer.from(response.slice(0, 33))

    return {
      pk: 'OBSOLETE PROPERTY',
      compressed_pk: compressedPk,
      return_code: returnCode,
      error_message: errorCodeToString(returnCode),
    }
  }, processErrorResponse)
}
