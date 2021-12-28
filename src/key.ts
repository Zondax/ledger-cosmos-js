import { Key } from '@terra-money/terra.js';
import { AccAddress, ValAddress } from '@terra-money/terra.js';
import { SimplePublicKey } from '@terra-money/terra.js';

import Transport from '@ledgerhq/hw-transport';
import { TerraApp } from './app';
import { ERROR_CODE } from './constants'
import { signatureImport } from 'secp256k1';
import * as bech32 from 'bech32';
import { SignatureV2, SignDoc } from '@terra-money/terra.js';

const LUNA_COIN_TYPE = 330;

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
   * Terra validator address. `terravaloper-` prefixed.
   */
  public get valAddress(): ValAddress {
    if (!this.publicKey) {
      throw new Error('Ledger is unintialized. Initialize it first.');
    }

    return bech32.encode('terravaloper', Array.from(this.publicKey.rawAddress()));
  }

  /** 
   * create and return initialized ledger key
   */
  public static async create(transport: Transport): Promise<LedgerKey> {
    const key = new LedgerKey(transport);
    await key.initialize();
    return key
  }

  /**
   * initialize LedgerKey.
   * it loads accAddress and pubkicKey from connedted Ledger
   */
  private async initialize() {
    await this.loadAccountDetails();
  }

  /**
   * get terra app with transport
   */
  private async getTerraApp(): Promise<TerraApp> {
    const app = new TerraApp(this.transport);
    const res = await app.initialize();
    if (res != null && res.return_code != ERROR_CODE.NoError) {
      let reason = '';
      if (res != null) reason = res.error_message;
      throw new Error(`Can't initialize LedgerKey ` + reason);
    }
    return app;
  }

  /**
   * get Address and Pubkey from Ledger
   */
  public async loadAccountDetails(): Promise<LedgerKey> {
    const res = await this.app.getAddressAndPubKey(this.path, 'terra');
    if (res.return_code != ERROR_CODE.NoError) {
      throw new Error(
        `Can't get address and public key. ${JSON.stringify(res)}`
      );
    }

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

    if (res.return_code != ERROR_CODE.NoError) {
      throw new Error(`Can't sign a message. ${JSON.stringify(res)}`);
    }
    return Buffer.from(signatureImport(Buffer.from(res.signature as any)));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async createSignature(_tx: SignDoc): Promise<SignatureV2> {
    throw new Error('direct sign mode is not supported');
  }
}
