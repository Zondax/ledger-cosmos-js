const fs = require("fs");

module.exports = {
  devServer: {
    https: {
      key: fs.readFileSync("certs/server.key"),
      cert: fs.readFileSync("certs/server.cert"),
      ca: fs.readFileSync("certs/cert.pem"),
    },
  },
};
