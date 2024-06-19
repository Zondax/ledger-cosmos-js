/******************************************************************************
 *  (c) 2018 - 2024 Zondax AG
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
 *****************************************************************************/
import { MockTransport } from "@ledgerhq/hw-transport-mocker";
import CosmosApp from "../src";
import {
  COSMOS_HRP,
  COSMOS_PATH,
  ETH_PATH,
  GET_ADDRESS_PUBKEY_RESPONSE,
  GET_ETH_ADDRESS_RESPONSE,
  INJ_HRP,
  INVALID_ADDR_RESPONSE,
  INVALID_HRP_RESPONSE,
  SIGN_BASIC_AMINO_RESPONSE,
  SIGN_BASIC_TEXTUAL_RESPONSE,
  SIGN_MLTISEND_AMINO_RESPONSE,
  example_tx_sign_textual,
  example_tx_str_basic,
  example_tx_str_msgMultiSend,
} from "./helper";
import { P2_VALUES } from "../src/consts";

describe("CosmosApp Address Generation", () => {
  it("Retreive Address and Pubkey", async () => {
    const responseBuffer = Buffer.from(GET_ADDRESS_PUBKEY_RESPONSE, "hex");

    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    const resp = await app.getAddressAndPubKey("m/44'/118'/5'/0/3", COSMOS_HRP);

    expect(resp.bech32_address.toString()).toEqual("cosmos1wkd9tfm5pqvhhaxq77wv9tvjcsazuaykwsld65");
    expect(resp.compressed_pk.length).toEqual(33);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "035c986b9ae5fbfb8e1e9c12c817f5ef8fdb821cdecaa407f1420ec4f8f1d766bf",
    );
  });

  it("Show Address and Pubkey", async () => {
    const responseBuffer = Buffer.from(GET_ADDRESS_PUBKEY_RESPONSE, "hex");

    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    const resp = await app.showAddressAndPubKey("m/44'/118'/5'/0/3", COSMOS_HRP);

    expect(resp.bech32_address.toString()).toEqual("cosmos1wkd9tfm5pqvhhaxq77wv9tvjcsazuaykwsld65");
    expect(resp.compressed_pk.length).toEqual(33);
    expect(resp.compressed_pk.toString("hex")).toEqual(
      "035c986b9ae5fbfb8e1e9c12c817f5ef8fdb821cdecaa407f1420ec4f8f1d766bf",
    );
  });

  it("Invalid HRP", async () => {
    const responseBuffer = Buffer.from(INVALID_HRP_RESPONSE, "hex");

    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    try {
      const resp = await app.getAddressAndPubKey(ETH_PATH, COSMOS_HRP);
    } catch (e: any) {
      expect(e.message).toEqual("Transaction rejected");
    }
  });

  it("Get Eth Address", async () => {
    const responseBuffer = Buffer.from(GET_ETH_ADDRESS_RESPONSE, "hex");

    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    const resp = await app.getAddressAndPubKey(ETH_PATH, INJ_HRP);

    expect(resp.bech32_address).toEqual("inj15n2h0lzvfgc8x4fm6fdya89n78x6ee2f3h7z3f");
  });

  it("Invalid Address Huge", async () => {
    const responseBuffer = Buffer.from(INVALID_ADDR_RESPONSE, "hex");

    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    try {
      const resp = await app.getAddressAndPubKey("m/44'/118'/2147483647'/0/4294967295", "cosmos");
    } catch (e: any) {
      expect(e.message).toEqual("Incorrect child value (bigger or equal to 0x80000000)");
    }
  });
});

describe("CosmosApp Signing", () => {
  it("Sign Basic Amino TX", async () => {
    const responseBuffer = Buffer.from(SIGN_BASIC_AMINO_RESPONSE, "hex");
    const tx = Buffer.from(JSON.stringify(example_tx_str_basic), "utf-8");
    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    const resp = await app.sign(COSMOS_PATH, tx, COSMOS_HRP, P2_VALUES.JSON);

    expect(resp.signature.toString("hex")).toEqual(
      "304402206687b768c2971c973a990f7d64d3b97e2fbd8b7ccbeed3b323182a1b1350c17b022048d671283a3fa33148b8f0c4dfcc7051c1141e038763cecfec6b2f2f3006de8f",
    );
  });

  it("Sign MsgMultisend TX", async () => {
    const responseBuffer = Buffer.from(SIGN_MLTISEND_AMINO_RESPONSE, "hex");
    const tx = Buffer.from(JSON.stringify(example_tx_str_msgMultiSend), "utf-8");
    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    const resp = await app.sign(COSMOS_PATH, tx, COSMOS_HRP, P2_VALUES.JSON);

    expect(resp.signature.toString("hex")).toEqual(
      "3045022100f3f3b094717136dc7a9d85af87c75fd1c3b0b68a5025123cac645bb5a7f76c530220184cc26659cb19b814d91359276e80db93c30daae76a285e6a4487047e3d14df",
    );
  });

  it("Sign Basic Textual TX", async () => {
    const responseBuffer = Buffer.from(SIGN_BASIC_TEXTUAL_RESPONSE, "hex");
    const tx = Buffer.from(JSON.stringify(example_tx_sign_textual), "utf-8");
    const transport = new MockTransport(responseBuffer);
    const app = new CosmosApp(transport);
    const resp = await app.sign(COSMOS_PATH, tx, COSMOS_HRP, P2_VALUES.TEXTUAL);

    expect(resp.signature.toString("hex")).toEqual(
      "3045022100e5e33eeaa83e5a5ecc5960e27689f7508b5541ef5c42cc7aeaa229793a2d1c7c022049d93b1835c2bed9857bbbf00ccccbf5152bfef05b9ab6c0cc05fc76bf96cc7a",
    );
  });
});
