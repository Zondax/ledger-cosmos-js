import { LCDClient, MsgSend } from '@terra-money/terra.js';
import { SignMode } from '@terra-money/terra.proto/cosmos/tx/signing/v1beta1/signing';
//import { LedgerKey } from '@terra-money/ledger-terra-js';//"../../devel/ledger-terra-js';
import { LedgerKey } from "../src";
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid';

async function main() {
  const lk = await LedgerKey.create(await TransportNodeHid.create(60 * 1000));
  const terra = new LCDClient({
    chainID: 'bombay-12',
    URL: 'https://bombay-lcd.terra.dev',
  });

  // a wallet can be created out of any key
  // wallets abstract transaction building
  const wallet = terra.wallet(lk);

  // create a simple message that moves coin balances
  const send = new MsgSend(
    'terra1mzv70x2avy4k95dujh9j3xh43nusxh8mh02cs5',
    'terra1x46rqay4d3cssq8gxxvqz8xt6nwlz4td20k38v',
    { uluna: 120400 }
  );

  const tx = await wallet
    .createAndSignTx({
      msgs: [send],
      memo: 'ledgerkey test',
      signMode: SignMode.SIGN_MODE_LEGACY_AMINO_JSON
    });

  const result = await terra.tx.broadcast(tx);
  console.log(`TX hash: ${result.txhash}  ${result.raw_log}`);
}

main().catch(console.error);

