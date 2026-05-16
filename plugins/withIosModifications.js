const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * THE STABLE FIX: Handles Podfile only for Xcode 16.
 * Note: Plist linking and AppDelegate are now handled by official Firebase plugins.
 */
const withIosModifications = (config) => {
  // 1. Podfile & Linker Stability (Still needed for Xcode 16)
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      let contents = await fs.promises.readFile(podfile, 'utf8');

      // Use modular headers globally but allow libraries to be static (stable)
      if (!contents.includes("use_modular_headers!")) {
        contents = `use_modular_headers!\n${contents}`;
      }

      // Force Xcode 16 Stability Settings
      if (!contents.includes("CLANG_ENABLE_EXPLICIT_MODULES")) {
        const xcodeFix = `
    installer.aggregate_targets.each do |target|
      target.user_project.build_configurations.each do |config|
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        config.build_settings['OTHER_LDFLAGS'] ||= ['$(inherited)']
        config.build_settings['OTHER_LDFLAGS'] << '-framework CoreMotion'
        config.build_settings['OTHER_LDFLAGS'] << '-framework MetricKit'
      end
    end
    
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['CLANG_ENABLE_MODULE_DEBUGGING'] = 'NO'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['CLANG_MODULES_AUTOLINK'] = 'YES'
      end
    end
`;
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

  return config;
};

module.exports = withIosModifications;
