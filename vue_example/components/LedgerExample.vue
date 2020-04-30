<template>
  <div class="cosmosLedger">
    <input id="webusb" v-model="transportChoice" type="radio" value="WebUSB" />
    <label for="webusb">WebUSB</label>
    <input id="u2f" v-model="transportChoice" type="radio" value="U2F" />
    <label for="u2f">U2F</label>
    <br />
    <!--
        Commands
    -->
    <button @click="getVersion">
      Get Version
    </button>

    <button @click="appInfo">
      AppInfo
    </button>

    <button @click="getPublicKey">
      Get pubkey only
    </button>

    <button @click="getAddress">
      Get Address and Pubkey
    </button>

    <button @click="showAddress">
      Show Address and Pubkey
    </button>

    <button @click="signExampleTx">
      Sign Example TX
    </button>
    <!--
        Commands
    -->
    <ul id="ledger-status">
      <li v-for="item in ledgerStatus" :key="item.index">
        {{ item.msg }}
      </li>
    </ul>
  </div>
</template>

<script>
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportU2F from "@ledgerhq/hw-transport-u2f";
import CosmosApp from "../../src";
import { ERROR_CODE } from "../../src/common";

const path = [44, 118, 5, 0, 3];

export default {
  name: "CosmosLedger",
  props: {},
  data() {
    return {
      deviceLog: [],
      transportChoice: "WebUSB",
    };
  },
  computed: {
    ledgerStatus() {
      return this.deviceLog;
    },
  },
  methods: {
    log(msg) {
      this.deviceLog.push({
        index: this.deviceLog.length,
        msg,
      });
    },
    async getTransport() {
      let transport = null;

      this.log(`Trying to connect via ${this.transportChoice}...`);
      if (this.transportChoice === "WebUSB") {
        try {
          transport = await TransportWebUSB.create();
        } catch (e) {
          this.log(e);
        }
      }

      if (this.transportChoice === "U2F") {
        try {
          transport = await TransportU2F.create(10000);
        } catch (e) {
          this.log(e);
        }
      }

      return transport;
    },
    async getVersion() {
      this.deviceLog = [];

      // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
      const transport = await this.getTransport();
      const app = new CosmosApp(transport);

      // now it is possible to access all commands in the app
      const response = await app.getVersion();
      if (response.return_code !== ERROR_CODE.NoError) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);
      this.log("Full response:");
      this.log(response);
    },
    async appInfo() {
      this.deviceLog = [];

      // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
      const transport = await this.getTransport();
      const app = new CosmosApp(transport);

      // now it is possible to access all commands in the app
      const response = await app.appInfo();
      if (response.return_code !== 0x9000) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log(response);
    },
    async getPublicKey() {
      this.deviceLog = [];

      // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
      const transport = await this.getTransport();
      const app = new CosmosApp(transport);

      let response = await app.getVersion();
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);

      // now it is possible to access all commands in the app
      response = await app.publicKey(path);
      if (response.return_code !== 0x9000) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log("Full response:");
      this.log(response);
    },
    async getAddress() {
      this.deviceLog = [];

      // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
      const transport = await this.getTransport();
      const app = new CosmosApp(transport);

      let response = await app.getVersion();
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);

      // now it is possible to access all commands in the app
      response = await app.getAddressAndPubKey(path, "cosmos");
      if (response.return_code !== 0x9000) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log("Full response:");
      this.log(response);
    },
    async showAddress() {
      this.deviceLog = [];

      // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
      const transport = await this.getTransport();
      const app = new CosmosApp(transport);

      let response = await app.getVersion();
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);

      // now it is possible to access all commands in the app
      this.log("Please click in the device");
      response = await app.showAddressAndPubKey(path, "cosmos");
      if (response.return_code !== ERROR_CODE.NoError) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log("Full response:");
      this.log(response);
    },
    async signExampleTx() {
      this.deviceLog = [];

      // Given a transport (U2F/HID/WebUSB) it is possible instantiate the app
      const transport = await this.getTransport();
      const app = new CosmosApp(transport);

      let response = await app.getVersion();
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);

      // now it is possible to access all commands in the app
      const message =
        '{"account_number":"6571","chain_id":"cosmoshub-2","fee":{"amount":[{"amount":"5000","denom":"uatom"}],"gas":"200000"},"memo":"Delegated with Ledger from union.market","msgs":[{"type":"cosmos-sdk/MsgDelegate","value":{"amount":{"amount":"1000000","denom":"uatom"},"delegator_address":"cosmos102hty0jv2s29lyc4u0tv97z9v298e24t3vwtpl","validator_address":"cosmosvaloper1grgelyng2v6v3t8z87wu3sxgt9m5s03xfytvz7"}}],"sequence":"0"}';
      response = await app.sign(path, message);

      this.log("Response received!");
      this.log("Full response:");
      this.log(response);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}

button {
  padding: 5px;
  font-weight: bold;
  font-size: medium;
}

ul {
  padding: 10px;
  text-align: left;
  alignment: left;
  list-style-type: none;
  background: black;
  font-weight: bold;
  color: greenyellow;
}
</style>
