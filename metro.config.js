const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add 'wasm' to asset extensions to support expo-sqlite on the Web platform
config.resolver.assetExts.push('wasm');

module.exports = config;
