import * as crypto from "crypto";
import * as secp256k1 from "secp256k1/elliptic";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import TerraApp, { PublicKeyResponse, AddressResponse, SignResponse } from "../src";
import { ERROR_CODE } from "../src/constants";

const debug = require("debug")("ledger-terra-js");

const TERRA_ADDRESS = "terra1c5e6d638ujm3m3qxtg2um3xgasfu2u6dwf8ry0";
const TERRA_HEX_PUBLIC_KEY = "026b4339d261cd771c2fe22b1815794535d5d5a6596fd3472044b4ea8fb641a99d";
// const TERRA_ADDRESS = "terra1lnl5tm84drx69qtygrj40steyvyk5emngeclcc";
// const TERRA_HEX_PUBLIC_KEY = "03ad97b6e920dda87454196c7899ed0bfd0a958b6f45a7235e6bde7359f04f0be1";

async function testSign(path: number[], message: string) {
  const responsePk = (await app.getPublicKey(path)) as PublicKeyResponse;
  const responseSign = (await app.sign(path, message)) as SignResponse;

  debug("testSign", { responsePk, responseSign });

  expect(responsePk.return_code).toEqual(ERROR_CODE.NoError);
  expect(responsePk.error_message).toEqual("No errors");
  expect(responsePk.compressed_pk).not.toBeNull();
  expect(responseSign.return_code).toEqual(ERROR_CODE.NoError);
  expect(responseSign.error_message).toEqual("No errors");
  expect(responseSign.signature).not.toBeNull();

  if (responsePk.compressed_pk && responseSign.signature) {
    // Check signature is valid
    const hash = crypto.createHash("sha256");
    const msgHash = hash.update(message).digest();

    const signature = secp256k1.signatureImport(Buffer.from(responseSign.signature.data));
    const signatureOk = secp256k1.verify(msgHash, signature, Buffer.from(responsePk.compressed_pk.data));
    expect(signatureOk).toEqual(true);
  }
}

jest.setTimeout(60000);

let transport;
let app: TerraApp;

beforeAll(async () => {
  transport = await TransportNodeHid.create(1000);
  app = new TerraApp(transport);
  await app.initialize();
  //done();
});

test("get version", async () => {
  const resp = await app.getVersion();
  debug("get version", resp);

  expect(resp.return_code).toEqual(ERROR_CODE.NoError);
  expect(resp.error_message).toEqual("No errors");
  expect(resp).toHaveProperty("test_mode");
  expect(resp).toHaveProperty("major");
  expect(resp).toHaveProperty("minor");
  expect(resp).toHaveProperty("patch");
  expect(resp.test_mode).toEqual(false);
});

test("publicKey", async () => {
  // Derivation path. First 3 items are automatically hardened!
  const path = [44, 330, 0, 0, 0];

  const resp = (await app.getPublicKey(path)) as PublicKeyResponse;

  expect(resp.return_code).toEqual(ERROR_CODE.NoError);
  expect(resp.error_message).toEqual("No errors");
  expect(resp).toHaveProperty("compressed_pk");
  expect(resp.compressed_pk).not.toBeNull();

  if (resp.compressed_pk) {
    const pkBuffer = Buffer.from(resp.compressed_pk.data);
    expect(pkBuffer.length).toEqual(33);
    expect(pkBuffer.toString("hex")).toEqual(TERRA_HEX_PUBLIC_KEY);
  }
});

test("getAddressAndPubKey", async () => {
  jest.setTimeout(60000);

  // Derivation path. First 3 items are automatically hardened!
  const path = [44, 330, 5, 0, 3];
  const resp = (await app.getAddressAndPubKey(path, "terra")) as AddressResponse;

  debug("getAddressAndPubKey", resp);

  expect(resp.return_code).toEqual(ERROR_CODE.NoError);
  expect(resp.error_message).toEqual("No errors");

  expect(resp).toHaveProperty("bech32_address");
  expect(resp).toHaveProperty("compressed_pk");

  expect(resp.bech32_address).toEqual(TERRA_ADDRESS);
  const pkBuffer = Buffer.from(resp.compressed_pk.data);
  expect(pkBuffer.length).toEqual(33);
});

test("show address and public key", async () => {
  jest.setTimeout(60000);

  // Derivation path. First 3 items are automatically hardened!
  const path = [44, 330, 5, 0, 3];
  const resp = (await app.showAddressAndPubKey(path, "terra")) as AddressResponse;

  debug("showAddressAndPubKey", resp);

  expect(resp.return_code).toEqual(ERROR_CODE.NoError);
  expect(resp.error_message).toEqual("No errors");

  expect(resp).toHaveProperty("bech32_address");
  expect(resp).toHaveProperty("compressed_pk");

  expect(resp.bech32_address).toEqual(TERRA_ADDRESS);
  const pkBuffer = Buffer.from(resp.compressed_pk.data);
  expect(pkBuffer.length).toEqual(33);
});

test("get device info", async () => {
  const resp = await app.getDeviceInfo();

  debug("deviceInfo", resp);

  expect(resp.return_code).toEqual(0x6e00);
  expect(resp.error_message).toEqual("This command is only available in the Dashboard");
});

test("sign and verify", async () => {
  jest.setTimeout(60000);

  // Derivation path. First 3 items are automatically hardened!
  const path = [44, 330, 0, 0, 0];
  const message = String.raw`{"account_number":"6571","chain_id":"columbus-3","fee":{"amount":[{"amount":"5000","denom":"uluna"}],"gas":"200000"},"memo":"Delegated with Ledger from union.market","msgs":[{"type":"staking/MsgDelegate","value":{"amount":{"amount":"1000000","denom":"uluna"},"delegator_address":"terra102hty0jv2s29lyc4u0tv97z9v298e24thg5trl","validator_address":"terravaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03x2mfyu7"}}],"sequence":"0"}`;

  await testSign(path, message);
});

test("sign tiny memo", async () => {
  jest.setTimeout(60000);
  // Derivation path. First 3 items are automatically hardened!
  const path = [44, 330, 0, 0, 0];
  const message = String.raw`{"account_number":"0","chain_id":"test-chain-1","fee":{"amount":[{"amount":"5","denom":"photon"}],"gas":"10000"},"memo":"A","msgs":[{"inputs":[{"address":"cosmosaccaddr1d9h8qat5e4ehc5","coins":[{"amount":"10","denom":"luna"}]}],"outputs":[{"address":"cosmosaccaddr1da6hgur4wse3jx32","coins":[{"amount":"10","denom":"luna"}]}]}],"sequence":"1"}`;

  await testSign(path, message);
});

test("sign empty memo", async () => {
  jest.setTimeout(60000);

  // Derivation path. First 3 items are automatically hardened!
  const path = [44, 330, 0, 0, 0];
  const message = String.raw`{"account_number":"0","chain_id":"test-chain-1","fee":{"amount":[{"amount":"5","denom":"photon"}],"gas":"10000"},"memo":"","msgs":[{"inputs":[{"address":"cosmosaccaddr1d9h8qat5e4ehc5","coins":[{"amount":"10","denom":"luna"}]}],"outputs":[{"address":"cosmosaccaddr1da6hgur4wse3jx32","coins":[{"amount":"10","denom":"luna"}]}]}],"sequence":"1"}`;

  await testSign(path, message);
});

test("sign withdraw", async () => {
  jest.setTimeout(60000);

  // Derivation path. First 3 items are automatically hardened!
  const path = [44, 330, 0, 0, 0];
  const txObj = {
    account_number: "108",
    chain_id: "columbus-3",
    fee: {
      amount: [
        {
          amount: "600",
          denom: "uluna",
        },
      ],
      gas: "200000",
    },
    memo: "",
    msgs: [
      {
        type: "distribution/MsgWithdrawDelegationReward",
        value: {
          delegator_address: "terra1kky4yzth6gdrm8ga5zlfwhav33yr7hl8ck7clh",
          validator_address: "terravaloper1kn3wugetjuy4zetlq6wadchfhvu3x7407xc2yx",
        },
      },
      {
        type: "distribution/MsgWithdrawDelegationReward",
        value: {
          delegator_address: "terra1kky4yzth6gdrm8ga5zlfwhav33yr7hl8ck7clh",
          validator_address: "terravaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9ufq6mv0",
        },
      },
      {
        type: "distribution/MsgWithdrawDelegationReward",
        value: {
          delegator_address: "terra1kky4yzth6gdrm8ga5zlfwhav33yr7hl8ck7clh",
          validator_address: "terravaloper1ey69r37gfxvxg62sh4r0ktpuc46pzjrmypn488",
        },
      },
      {
        type: "distribution/MsgWithdrawDelegationReward",
        value: {
          delegator_address: "terra1kky4yzth6gdrm8ga5zlfwhav33yr7hl8ck7clh",
          validator_address: "terravaloper1648ynlpdw7fqa2axt0w2yp3fk542junlaujy76",
        },
      },
    ],
    sequence: "106",
  };

  await testSign(path, JSON.stringify(txObj));
});

test("sign big tx", async () => {
  jest.setTimeout(60000);

  const path = [44, 330, 0, 0, 0]; // Derivation path. First 3 items are automatically hardened!
  const message =
    '{"account_number":"108","chain_id":"columbus-3",' +
    '"fee":{"amount":[{"amount":"600","denom":"uluna"}],"gas":"200000"},"memo":"",' +
    '"msgs":[{"type":"distribution/MsgWithdrawDelegationReward","value":' +
    '{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1qwl879nx9t6kef4supyazayf7vjhennyh568ys"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1x88j7vp2xnw3zec8ur3g4waxycyz7m0mahdv3p"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03x2mfyu7"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1ttfytaf43nkytzp8hkfjfgjc693ky4t3y2n2ku"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1wdrypwex63geqswmcy5qynv4w3z3dyef2qmyna"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper102ruvpv2srmunfffxavttxnhezln6fnc54at8c"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper10e4vsut6suau8tk9m6dnrm0slgd6npe3jx5xpv"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1sxx9mszve0gaedz5ld7qdkjkfv8z992ax69k08"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1ssm0d433seakyak8kcf93yefhknjleeds4y3em"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper13sduv92y3xdhy3rpmhakrc3v7t37e7ps9l0kpv"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper15urq2dtp9qce4fyc85m6upwm9xul3049e02707"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper14kn0kk33szpwus9nh8n87fjel8djx0y070ymmj"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper14lultfckehtszvzw4ehu0apvsr77afvyju5zzy"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1k9a0cs97vul8w2vwknlfmpez6prv8klv03lv3d"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1kj0h4kn4z5xvedu2nd9c4a9a559wvpuvu0h6qn"}},{"type":"distribution/MsgWithdrawDelegationReward",' +
    '"value":{"delegator_address":"terra14lultfckehtszvzw4ehu0apvsr77afvyhgqhwh","validator_address":' +
    '"terravaloper1hjct6q7npsspsg3dgvzk3sdf89spmlpfdn6m9d"}}],"sequence":"106"}';

  const responsePk = await app.getPublicKey(path);
  const responseSign = await app.sign(path, message);

  debug("sign big tx", { responsePk, responseSign });

  expect(responsePk.return_code).toEqual(ERROR_CODE.NoError);
  expect(responsePk.error_message).toEqual("No errors");

  switch (app.getVersion().major) {
    case 1:
      expect(responseSign.return_code).toEqual(0x9000);
      expect(responseSign.error_message).toEqual("No errors");
      break;
    default:
      expect(false).toEqual(true);
  }
});

test("sign invalid", async () => {
  jest.setTimeout(60000);

  const path = [44, 330, 0, 0, 0]; // Derivation path. First 3 items are automatically hardened!
  const invalidMessage =
    '{"chain_id":"local-testnet","fee":{"amount":[],"gas":"500000"},"memo":"","msgs":[{"delegator_addr":"cosmos1qpd4xgtqmxyf9ktjh757nkdfnzpnkamny3cpzv","validator_addr":"cosmosvaloper1zyp0axz2t55lxkmgrvg4vpey2rf4ratcsud07t","value":{"amount":"1","denom":"stake"}}],"sequence":"0"}';

  const responseSign = await app.sign(path, invalidMessage);

  debug("sign invalid", { responseSign });

  switch (app.getVersion().major) {
    case 1:
      expect(responseSign.return_code).toEqual(0x6984);
      expect(responseSign.error_message).toEqual("Data is invalid : JSON Missing account number");
      break;
    default:
      debug("Version not supported");
      expect(false).toEqual(true);
  }
});
