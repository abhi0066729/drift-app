const { withDangerousMod, withAppDelegate } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * THE STABLE FIX: Handles Podfile only for Xcode 16 AND Swift AppDelegate injection.
 * Note: Plist linking is handled by expo core via googleServicesFile.
 */
const withIosModifications = (config) => {
  // 1. Manual Swift AppDelegate Injection
  config = withAppDelegate(config, (config) => {
    if (config.modResults.language === 'swift') {
      let contents = config.modResults.contents;
      
      // Add import
      if (!contents.includes('import FirebaseCore')) {
        contents = 'import FirebaseCore\n' + contents;
      }
      
      // Add FirebaseApp.configure()
      if (!contents.includes('FirebaseApp.configure()')) {
        // Look for the start of the didFinishLaunchingWithOptions function
        const match = contents.match(/func application\s*\(\s*_\s*application\s*:\s*UIApplication\s*,\s*didFinishLaunchingWithOptions/);
        if (!match) {
          throw new Error("CRITICAL: Could not find didFinishLaunchingWithOptions in AppDelegate.swift to inject Firebase!");
        }
        
        // Find the first opening brace after the function definition
        const braceIndex = contents.indexOf('{', match.index);
        if (braceIndex === -1) {
          throw new Error("CRITICAL: Could not find opening brace for didFinishLaunchingWithOptions in AppDelegate.swift!");
        }
        
        // Inject FirebaseApp.configure() right after the opening brace
        contents = contents.slice(0, braceIndex + 1) + '\n    FirebaseApp.configure()' + contents.slice(braceIndex + 1);
      }
      
      config.modResults.contents = contents;
    }
    return config;
  });

  // 2. Podfile & Linker Stability (Still needed for Xcode 16)
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
