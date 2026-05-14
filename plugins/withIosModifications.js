const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Self-contained plugin to fix Firebase Precompilation on Xcode 16/Codemagic
 */
const withIosModifications = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      let contents = await fs.promises.readFile(podfile, 'utf8');

      // Add modular headers fix for Firebase
      if (!contents.includes("pod 'FirebaseCore', :modular_headers => true")) {
        // We insert this at the top of the post_install or right after the platform line
        const fix = `
  # Firebase Xcode 16 Fix
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseCrashlytics', :modular_headers => true
`;
        contents = contents.replace(/platform :ios, .*/, (match) => `${match}${fix}`);
      }

      await fs.promises.writeFile(podfile, contents);
      return config;
    },
  ]);
};

module.exports = withIosModifications;
