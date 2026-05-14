const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * DEFINITIVE FIX for Xcode 16 / Firebase Precompilation Failures on Codemagic
 */
const withIosModifications = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      let contents = await fs.promises.readFile(podfile, 'utf8');

      // 1. Add global modular headers
      if (!contents.includes("use_modular_headers!")) {
        contents = `use_modular_headers!\n${contents}`;
      }

      // 2. Add the post_install hook to disable the crashing Xcode 16 features
      if (!contents.includes("CLANG_ENABLE_EXPLICIT_MODULES")) {
        const xcodeFix = `
    # Fix for Xcode 16 Precompilation / ScanDependencies crashes
    installer.aggregate_targets.each do |target|
      target.user_project.build_configurations.each do |config|
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
      end
      target.user_project.save
    end
    
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;
        // Insert into the post_install block
        if (contents.includes("post_install do |installer|")) {
          contents = contents.replace("post_install do |installer|", `post_install do |installer|${xcodeFix}`);
        } else {
          contents += `\npost_install do |installer|\n${xcodeFix}\nend\n`;
        }
      }

      await fs.promises.writeFile(podfile, contents);
      return config;
    },
  ]);
};

module.exports = withIosModifications;
