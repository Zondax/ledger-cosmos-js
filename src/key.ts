import { Key } from '@terra-money/terra.js';
import { AccAddress } from '@terra-money/terra.js';
import { SimplePublicKey } from '@terra-money/terra.js';

import Transport from '@ledgerhq/hw-transport';
import TerraApp from './app';
import { ERROR_CODE } from './constants'
import { signatureImport } from 'secp256k1';
import * as bech32 from 'bech32';
import { SignatureV2, SignDoc } from '@terra-money/terra.js';
import { CommonResponse } from './types';
import semver from 'semver';

const LUNA_COIN_TYPE = 330;
const INTERACTION_TIMEOUT = 120;
const REQUIRED_APP_VERSION = "1.0.0";

declare global {
  interface Window {
    google: any
  }
  interface Navigator {
    hid: any
  }
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LedgerError"
  }
}

/**
 * Key implementation that uses Ledger to sign transactions. Keys should be registered
 * in Ledger device
 */
export class LedgerKey extends Key {
  private _accAddress?: AccAddress;
  private app: TerraApp;
  private path: number[] = [44, LUNA_COIN_TYPE, 0, 0, 0];

  /**
   *
   * @param transport transporter for LedgerKey
   */
  constructor(private transport: Transport) {
    super();
    this.app = new TerraApp(this.transport);
    //this.app.initialize().then((res) => { console.log(res) });
  }

  /**
   * Terra account address. `terra-` prefixed.
   */
  public get accAddress(): AccAddress {
    if (!this.publicKey) {
      throw new Error('Ledger is unintialized. Initialize it first.');
    }

    return this.publicKey.address();
  }

  /** 
   * create and return initialized ledger key
   */
  public static async create(transport?: Transport, index?: number): Promise<LedgerKey> {

    if (!transport) {
      transport = await createTransport();
    }
    const key = new LedgerKey(transport);

    if (index != undefined) {
      key.path[4] = index
    }

    if (transport && typeof transport.on === "function") {
      transport.on("disconnect", () => {
        key.transport = null
      })
    }

    await key.initialize().catch(handleConnectError);
    return key
  }

  /**
   * initialize LedgerKey.
   * it loads accAddress and pubkicKey from connedted Ledger
   */
  private async initialize() {
    const res = await this.app.initialize()

    const { app_name: appName } = this.app.getInfo()
    if (appName !== "Terra") {
      throw new LedgerError("Open the Terra app in the Ledger")
    }

    const { major, minor, patch } = this.app.getVersion()
    const version = `${major}.${minor}.${patch}`
    if (appName === "Terra" && semver.lt(version, REQUIRED_APP_VERSION)) {
      throw new LedgerError(
        "Outdated version: Update Ledger Terra App to the latest version"
      )
    }
    checkLedgerErrors(res);
    await this.loadAccountDetails();
  }

  /**
   * get Address and Pubkey from Ledger
   */
  public async loadAccountDetails(): Promise<LedgerKey> {
    const res = await this.app.getAddressAndPubKey(this.path, 'terra');
    checkLedgerErrors(res)

    this._accAddress = res.bech32_address;
    this.publicKey = new SimplePublicKey(
      Buffer.from(res.compressed_pk.data).toString('base64')
    );
    return this;
  }

  public async sign(message: Buffer): Promise<Buffer> {
    if (!this.publicKey) {
      this.loadAccountDetails();
    }
    const res = await this.app.sign(this.path, message);
    checkLedgerErrors(res)

    return Buffer.from(signatureImport(Buffer.from(res.signature as any)));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async createSignature(_tx: SignDoc): Promise<SignatureV2> {
    throw new Error('direct sign mode is not supported');
  }
}


const handleTransportError = (err: Error) => {
  if (err.message.startsWith("The device is already open")) {
    // ignore this error
    return; //transport
  }

  if (err.name === "TransportOpenUserCancelled") {
    throw new LedgerError(
      "Couldn't find the Ledger. Check the Ledger is plugged in and unlocked."
    )
  }

  throw err
}

const handleConnectError = (err: Error) => {

  const message = err.message.trim()

  /* istanbul ignore next: specific error rewrite */
  if (message.startsWith("No WebUSB interface found for the Ledger device")) {
    throw new LedgerError(
      `Couldn't connect to a Ledger device. Use Ledger Live to upgrade the Ledger firmware to version ${REQUIRED_APP_VERSION} or later.`
    )
  }

  /* istanbul ignore next: specific error rewrite */
  if (message.startsWith("Unable to claim interface")) {
    // apparently can't use it in several tabs in parallel
    throw new LedgerError(
      "Couldn't access Ledger device. Is it being used in another tab?"
    )
  }

  /* istanbul ignore next: specific error rewrite */
  if (message.startsWith("Not supported")) {
    throw new LedgerError(
      "This browser doesn't support WebUSB yet. Update it to the latest version."
    )
  }

  /* istanbul ignore next: specific error rewrite */
  if (message.startsWith("No device selected")) {
    throw new LedgerError(
      "Couldn't find the Ledger. Check the Ledger is plugged in and unlocked."
    )
  }

  // throw unknown error
  throw err
}

const checkLedgerErrors = (response: CommonResponse | null) => {
  if (!response) {
    return
  }

  const { error_message, device_locked } = response

  if (device_locked) {
    throw new LedgerError("Ledger's screensaver mode is on")
  }

  if (error_message.startsWith("TransportRaceCondition")) {
    throw new LedgerError("Finish previous action in Ledger")
  } else if (error_message.startsWith("DisconnectedDeviceDuringOperation")) {
    throw new LedgerError("Open the Terra app in the Ledger")
  }

  switch (error_message) {
    case "U2F: Timeout":
      throw new LedgerError(
        "Couldn't find a connected and unlocked Ledger device"
      )

    case "App does not seem to be open":
      throw new LedgerError("Open the Terra app in the Ledger")

    case "Command not allowed":
      throw new LedgerError("Transaction rejected")

    case "Transaction rejected":
      throw new LedgerError("User rejected the transaction")

    case "Unknown Status Code: 26628":
      throw new LedgerError("Ledger's screensaver mode is on")

    case "Instruction not supported":
      throw new LedgerError(
        "Check the Ledger is running latest version of Terra"
      )

    case "No errors":
      break

    default:
      throw new LedgerError(error_message)
  }
}


const isWindows = (platform: string) => platform.indexOf("Win") > -1
const checkBrowser = (userAgent: string): string => {
  const ua = userAgent.toLowerCase()
  const isChrome = /chrome|crios/.test(ua) && !/edge|opr\//.test(ua)
  const isBrave = isChrome && !window.google

  if (!isChrome && !isBrave) {
    throw new LedgerError("This browser doesn't support Ledger devices")
  }

  return isChrome ? "chrome" : "brave"
}

async function createTransport(): Promise<Transport> {
  let transport;

  checkBrowser(navigator.userAgent)

  if (isWindows(navigator.platform)) {
    // For Windows
    if (!navigator.hid) {
      throw new LedgerError(
        "This browser doesn't have HID enabled. Enable this feature by visiting: chrome://flags/#enable-experimental-web-platform-features"
      )
    }

    const TransportWebHid = require("@ledgerhq/hw-transport-webhid").default
    transport = await TransportWebHid.create(INTERACTION_TIMEOUT * 1000).catch(
      handleTransportError
    )
  } else {
    // For other than Windows
    const TransportWebUsb = require("@ledgerhq/hw-transport-webusb").default
    transport = await TransportWebUsb.create(INTERACTION_TIMEOUT * 1000).catch(
      handleTransportError
    )
  }
  return transport;

}
