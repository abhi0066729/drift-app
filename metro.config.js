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

/**
 * SELECTIVE AI RESOLVER:
 * - Web: Mocked (Native AI modules do not exist on web).
 * - Native (Android/iOS): Real (Requires a fresh 'eas build' to link native code).
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isNativeAiModule =
    moduleName === 'react-native-executorch' ||
    moduleName === 'onnxruntime-react-native';

  if (platform === 'web' && isNativeAiModule) {
    return {
      filePath: path.resolve(__dirname, 'mocks/native-mock.js'),
      type: 'sourceFile',
    };
  }

  // Standard resolver for everything else
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
