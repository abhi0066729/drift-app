const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const {
  resolver: { assetExts, sourceExts },
} = config;

// 1. Add AI and DB specific asset extensions
assetExts.push('wasm');
assetExts.push('onnx');
assetExts.push('pte');

// 2. Configure Mocks for Export stability
// This redirects native-only AI libraries to a JS mock during the static export phase
config.resolver.extraNodeModules = {
  'react-native-executorch': path.resolve(__dirname, 'mocks/native-mock.js'),
  'onnxruntime-react-native': path.resolve(__dirname, 'mocks/native-mock.js'),
};

config.resolver.assetExts = assetExts;
config.resolver.sourceExts = [...sourceExts, 'mjs'];

// 3. Performance optimizations
config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;
