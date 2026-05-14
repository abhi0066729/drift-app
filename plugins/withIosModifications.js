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

      // Add global modular headers fix for Firebase/Swift compatibility
      if (!contents.includes("use_modular_headers!")) {
        contents = `use_modular_headers!\n${contents}`;
      }

      // Also ensure specific Firebase pods have it (redundancy)
      if (!contents.includes("pod 'FirebaseCore', :modular_headers => true")) {
        const fix = `
  # Firebase Static Framework Fix
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
