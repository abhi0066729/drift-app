const { withDangerousMod, withAppDelegate } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withIosModifications = (config) => {
  // 1. Manual AppDelegate Injection
  config = withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('#import <Firebase.h>')) {
      contents = contents.replace(/#import "AppDelegate.h"/, '#import "AppDelegate.h"\n#import <Firebase.h>');
    }
    if (!contents.includes('[FIRApp configure];')) {
      contents = contents.replace(
        /(-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\s*\)application\s+didFinishLaunchingWithOptions:\s*\(NSDictionary\s*\*\s*\)launchOptions\s*\{)/,
        '$1\n  [FIRApp configure];'
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  // 2. Manual Podfile & Search Path Fixes
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      let contents = await fs.promises.readFile(podfile, 'utf8');

      // Global fixes
      if (!contents.includes("use_modular_headers!")) {
        contents = `use_modular_headers!\n${contents}`;
      }

      // Insert pods inside the main target block
      if (!contents.includes("pod 'FirebaseCore'")) {
        const firebasePods = "\n    pod 'FirebaseCore', :modular_headers => true\n    pod 'FirebaseCrashlytics', :modular_headers => true";
        // Target the end of the use_expo_modules! or the start of the target block
        contents = contents.replace(/use_expo_modules!/, `use_expo_modules!${firebasePods}`);
      }

      // Comprehensive Xcode 16 / Static Linkage Fix
      if (!contents.includes("CLANG_ENABLE_EXPLICIT_MODULES")) {
        const xcodeFix = `
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
        # Fix for RNFBCrashlytics and react-native-executorch
        config.build_settings['HEADER_SEARCH_PATHS'] = '$(inherited) "${PODS_ROOT}/Headers/Public/Firebase" "${PODS_ROOT}/Headers/Public/FirebaseCore" "${PODS_ROOT}/Headers/Public/FirebaseCrashlytics"'
        config.build_settings['CLANG_MODULES_AUTOLINK'] = 'NO'
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
