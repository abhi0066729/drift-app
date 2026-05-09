const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const {
  resolver: { assetExts, sourceExts },
} = config;

// 1. Add AI and DB specific asset extensions
assetExts.push('wasm');
assetExts.push('onnx');
assetExts.push('pte');

// 2. Ensure smooth module resolution for production
config.resolver.assetExts = assetExts;
config.resolver.sourceExts = [...sourceExts, 'mjs'];

// 3. Performance optimizations for the production bundle
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;
