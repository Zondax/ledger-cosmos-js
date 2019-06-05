<template>
  <div class="cosmosLedger">
    <input
      id="webusb"
      v-model="transportChoice"
      type="radio"
      value="WebUSB"
    >
    <label for="webusb">WebUSB</label>
    <input
      id="u2f"
      v-model="transportChoice"
      type="radio"
      value="U2F"
    >
    <label for="u2f">U2F</label>
    <br>
    <button @click="tryConnect">
      Connect and get version
    </button>
    <ul id="ledger-status">
      <li
        v-for="item in ledgerStatus"
        :key="item.index"
      >
        {{ item.msg }}
      </li>
    </ul>
  </div>
</template>

<script>
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportU2F from '@ledgerhq/hw-transport-u2f';
import CosmosApp from '../../src';

export default {
    name: 'CosmosLedger',
    props: {
    },
    data() {
        return {
            deviceLog: [],
            transportChoice: 'WebUSB',
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
        async tryConnect() {
            this.deviceLog = [];
            this.log(`Trying to connect via ${this.transportChoice}...`);

            let transport = null;

            if (this.transportChoice === 'WebUSB') {
                try {
                    transport = await TransportWebUSB.create();
                } catch (e) {
                    this.log(e);
                    return;
                }
            }

            if (this.transportChoice === 'U2F') {
                try {
                    transport = await TransportU2F.create(10000);
                } catch (e) {
                    this.log(e);
                    return;
                }
            }

            // Given a transport (U2F/HIF/WebUSB) it is possible instantiate the app
            const app = new CosmosApp(transport);

            // now it is possible to access all commands in the app
            const response = await app.getVersion();
            if (response.error_message !== 'No errors') {
                this.log(`Error [${response.error_message}] ${response.error_message}`);
                return;
            }

            this.log('Response received!');
            this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
            this.log(`Device Locked: ${response.device_locked}`);
            this.log(`Test mode: ${response.test_mode}`);
            this.log('Full response:');
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
