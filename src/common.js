export const CLA = 0x55;
export const CHUNK_SIZE = 250;
export const APP_KEY = "CSM";

export const INS = {
  GET_VERSION: 0x00,
  INS_PUBLIC_KEY_SECP256K1: 0x01, // Obsolete
  SIGN_SECP256K1: 0x02,
  GET_ADDR_SECP256K1: 0x04,
};

export const PAYLOAD_TYPE = {
  INIT: 0x00,
  ADD: 0x01,
  LAST: 0x02,
};

export const P1_VALUES = {
  ONLY_RETRIEVE: 0x00,
  SHOW_ADDRESS_IN_DEVICE: 0x01,
};

export const ERROR_CODE = {
  NoError: 0x9000,
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
  0x6802: "Error deriving keys",
  0x6400: "Execution Error",
  0x6700: "Wrong Length",
  0x6982: "Empty Buffer",
  0x6983: "Output buffer too small",
  0x6984: "Data is invalid",
  0x6985: "Conditions not satisfied",
  0x6986: "Transaction rejected",
  0x6a80: "Bad key handle",
  0x6b00: "Invalid P1/P2",
  0x6d00: "Instruction not supported",
  0x6e00: "App does not seem to be open",
  0x6f00: "Unknown error",
  0x6f01: "Sign/verify error",
};

export function errorCodeToString(statusCode) {
  if (statusCode in ERROR_DESCRIPTION) return ERROR_DESCRIPTION[statusCode];
  return `Unknown Status Code: ${statusCode}`;
}

function isDict(v) {
  return typeof v === "object" && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

export function processErrorResponse(response) {
  if (response) {
    if (isDict(response)) {
      if (Object.prototype.hasOwnProperty.call(response, "statusCode")) {
        return {
          return_code: response.statusCode,
          error_message: errorCodeToString(response.statusCode),
        };
      }

      if (
        Object.prototype.hasOwnProperty.call(response, "return_code") &&
        Object.prototype.hasOwnProperty.call(response, "error_message")
      ) {
        return response;
      }
    }
    return {
      return_code: 0xffff,
      error_message: response.toString(),
    };
  }

  return {
    return_code: 0xffff,
    error_message: response.toString(),
  };
}

export async function getVersion(transport) {
  return transport.send(CLA, INS.GET_VERSION, 0, 0).then(response => {
    const errorCodeData = response.slice(-2);
    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

    let targetId = 0;
    if (response.length >= 9) {
      /* eslint-disable no-bitwise */
      targetId = (response[5] << 24) + (response[6] << 16) + (response[7] << 8) + (response[8] << 0);
      /* eslint-enable no-bitwise */
    }

    return {
      return_code: returnCode,
      error_message: errorCodeToString(returnCode),
      // ///
      test_mode: response[0] !== 0,
      major: response[1],
      minor: response[2],
      patch: response[3],
      device_locked: response[4] === 1,
      target_id: targetId.toString(16),
    };
  }, processErrorResponse);
}

export async function getAppInfo(transport) {
  return transport.send(0xb0, 0x01, 0, 0).then(response => {
    const errorCodeData = response.slice(-2);
    const returnCode = errorCodeData[0] * 256 + errorCodeData[1];

    const result = {};

    let appName = "err";
    let appVersion = "err";
    let flagLen = 0;
    let flagsValue = 0;

    if (response[0] !== 1) {
      // Ledger responds with format ID 1. There is no spec for any format != 1
      result.error_message = "response format ID not recognized";
      result.return_code = 0x9001;
    } else {
      const appNameLen = response[1];
      appName = response.slice(2, 2 + appNameLen).toString("ascii");
      let idx = 2 + appNameLen;
      const appVersionLen = response[idx];
      idx += 1;
      appVersion = response.slice(idx, idx + appVersionLen).toString("ascii");
      idx += appVersionLen;
      const appFlagsLen = response[idx];
      idx += 1;
      flagLen = appFlagsLen;
      flagsValue = response[idx];
    }

    return {
      return_code: returnCode,
      error_message: errorCodeToString(returnCode),
      // //
      appName,
      appVersion,
      flagLen,
      flagsValue,
      // eslint-disable-next-line no-bitwise
      flag_recovery: (flagsValue & 1) !== 0,
      // eslint-disable-next-line no-bitwise
      flag_signed_mcu_code: (flagsValue & 2) !== 0,
      // eslint-disable-next-line no-bitwise
      flag_onboarded: (flagsValue & 4) !== 0,
      // eslint-disable-next-line no-bitwise
      flag_pin_validated: (flagsValue & 128) !== 0,
    };
  }, processErrorResponse);
}