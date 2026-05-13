const app = require("./app.json");

const extra = {
  ...app.expo.extra,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || app.expo.extra.apiUrl,
  jitsiDomain:
    process.env.EXPO_PUBLIC_JITSI_DOMAIN || app.expo.extra.jitsiDomain,
};

module.exports = {
  ...app.expo,
  extra,
};
