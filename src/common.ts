export interface JSONBuffer {
  type: "Buffer";
  data: number[];
}

export interface CommonResponse {
  return_code: number;
  error_message: string;
}

export interface PublicKeyResponse extends CommonResponse {
  pk: "OBSOLETE PROPERTY";
  compressed_pk: JSONBuffer | null;
}

export interface AddressResponse extends CommonResponse {
  bech32_address: string;
  compressed_pk: JSONBuffer;
}

export interface SignResponse extends CommonResponse {
  signature: null | JSONBuffer;
}

export interface AppInfoResponse extends CommonResponse {
  app_name: string;
  app_version: string;
  flag_len: number;
  flags_value: number;
  flag_recovery: boolean;
  flag_signed_mcu_code: boolean;
  flag_onboarded: boolean;
  flag_pin_validated: Boolean;
}

export interface VersionResponse extends CommonResponse {
  test_mode: boolean;
  major: number;
  minor: number;
  patch: number;
  device_locked: boolean;
  target_id: string;
}

export interface DeviceInfoResponse extends CommonResponse {
  targetId: string; // '31100004',
  seVersion: string; // '1.6.0',
  flag: string; // 'a6000000',
  mcuVersion: string; // '1.11'
}

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

export function errorCodeToString(statusCode): string {
  if (statusCode in ERROR_DESCRIPTION) {
    return ERROR_DESCRIPTION[statusCode];
  }

  return `Unknown Status Code: ${statusCode}`;
}

function isDict(v): boolean {
  return typeof v === "object" && v !== null && !(v instanceof Array) && !(v instanceof Date);
}

export function processErrorResponse(response: any): CommonResponse {
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
