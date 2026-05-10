const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const {
  resolver: { assetExts, sourceExts },
} = config;

assetExts.push('wasm');
assetExts.push('onnx');
assetExts.push('pte');

// HARD OVERRIDE: Force Metro to completely ignore the native AI libraries during export
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-executorch' || moduleName === 'onnxruntime-react-native') {
    return {
      filePath: path.resolve(__dirname, 'mocks/native-mock.js'),
      type: 'sourceFile',
    };
  }
  // Optionally, you can pass the request to the standard resolver
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.assetExts = assetExts;
config.resolver.sourceExts = [...sourceExts, 'mjs'];

config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

module.exports = config;
