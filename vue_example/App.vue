<template>
  <div id="app">
    <img alt="Zondax logo" src="./assets/logo.png" width="300" />
    <h1>Cosmos integration example</h1>
    <LedgerExample msg="Minimal integration example" />
  </div>
</template>

<script>
import LedgerExample from "./components/LedgerExample.vue";

export default {
  name: "App",
  components: {
    LedgerExample,
  },
};
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
