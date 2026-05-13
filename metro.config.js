// Metro config for Expo with Tamagui.
// Out-of-the-box Expo defaults are fine — we just need to make sure
// .web.tsx files resolve before .tsx on the web platform so our
// platform-split JitsiEmbed picks up the iframe implementation.

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
