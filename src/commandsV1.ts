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
import { CLA, ERROR_CODE, errorCodeToString, INS, processErrorResponse, P2_VALUES } from './common'

export function serializePathv1(path: number[]) {
  if (path == null || path.length < 3) {
    throw new Error('Invalid path.')
  }
  if (path.length > 10) {
    throw new Error('Invalid path. Length should be <= 10')
  }
  const buf = Buffer.alloc(1 + 4 * path.length)
  buf.writeUInt8(path.length, 0)
  for (let i = 0; i < path.length; i += 1) {
    let v = path[i]
    if (i < 3) {
      // eslint-disable-next-line no-bitwise
      v |= 0x80000000 // Harden
    }
    buf.writeInt32LE(v, 1 + i * 4)
  }
  return buf
}

export async function signSendChunkv1(app: any, chunkIdx: number, chunkNum: number, chunk: Buffer, txType = P2_VALUES.JSON) {
  return app.transport
    .send(CLA, INS.SIGN_SECP256K1, chunkIdx, txType, chunk, [ERROR_CODE.NoError, 0x6984, 0x6a80])
    .then((response: any) => {
      const errorCodeData = response.slice(-2)
      const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
      let errorMessage = errorCodeToString(returnCode)

      if (returnCode === 0x6a80 || returnCode === 0x6984) {
        errorMessage = `${errorMessage} : ${response.slice(0, response.length - 2).toString('ascii')}`
      }

      let signature = null
      if (response.length > 2) {
        signature = response.slice(0, response.length - 2)
      }

      return {
        signature,
        return_code: returnCode,
        error_message: errorMessage,
      }
    }, processErrorResponse)
}

function compressPublicKey(publicKey: Buffer) {
  if (publicKey.length !== 65) {
    throw new Error('decompressed public key length should be 65 bytes')
  }
  const y = publicKey.slice(33, 65)
  // eslint-disable-next-line no-bitwise
  const z = Buffer.from([2 + (y[y.length - 1] & 1)])
  return Buffer.concat([z, publicKey.slice(1, 33)])
}

export async function publicKeyv1(app: any, data: Buffer) {
  return app.transport.send(CLA, INS.INS_PUBLIC_KEY_SECP256K1, 0, 0, data, [ERROR_CODE.NoError]).then((response: any) => {
    const errorCodeData = response.slice(-2)
    const returnCode = errorCodeData[0] * 256 + errorCodeData[1]
    const pk = Buffer.from(response.slice(0, 65))

    return {
      pk,
      compressed_pk: compressPublicKey(pk),
      return_code: returnCode,
      error_message: errorCodeToString(returnCode),
    }
  }, processErrorResponse)
}
