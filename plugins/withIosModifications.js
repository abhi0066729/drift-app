const { withProjectBuildProperties } = require('expo-build-properties/plugin');

/**
 * Custom Plugin to fix Xcode 16 / Firebase Precompilation Failures
 */
const withIosModifications = (config) => {
  return withProjectBuildProperties(config, {
    ios: {
      deploymentTarget: '15.1',
      useFrameworks: 'static',
      extraPods: [
        { name: 'FirebaseCore', modular_headers: true },
        { name: 'FirebaseCrashlytics', modular_headers: true }
      ]
    }
  });
};

module.exports = withIosModifications;
