// Metro config for Expo with Tamagui + Apollo.
// Out-of-the-box Expo defaults are fine — we just need to:
// 1. Make sure .web.tsx files resolve before .tsx on the web platform
//    so our platform-split JitsiEmbed picks up the iframe implementation.
// 2. Add `.mjs` to the source/asset extensions. The `graphql` package
//    (a transitive dep of @apollo/client) ships pure ESM with .mjs
//    extensions on internal rule files — Metro's default extension
//    list excludes .mjs from node_modules resolution and fails with
//    "None of these files exist: ...NoDeprecatedCustomRule.mjs".

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts ?? []), "mjs", "cjs"]),
);

module.exports = config;
