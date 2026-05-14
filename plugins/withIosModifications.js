const { withDangerousMod, withAppDelegate } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * THE NUCLEAR OPTION: Manual Firebase Setup for iOS
 * Bypasses the broken @react-native-firebase/app config plugin.
 */
const withIosModifications = (config) => {
  // 1. Manually inject [FIRApp configure] into AppDelegate
  config = withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    
    // Add import if missing
    if (!contents.includes('#import <Firebase.h>')) {
      contents = contents.replace(/#import "AppDelegate.h"/, '#import "AppDelegate.h"\n#import <Firebase.h>');
    }
    
    // Add [FIRApp configure] if missing
    if (!contents.includes('[FIRApp configure];')) {
      // Find the didFinishLaunchingWithOptions method and insert at the start
      contents = contents.replace(
        /(-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\s*\)application\s+didFinishLaunchingWithOptions:\s*\(NSDictionary\s*\*\s*\)launchOptions\s*\{)/,
        '$1\n  [FIRApp configure];'
      );
    }
    
    config.modResults.contents = contents;
    return config;
  });

  // 2. Manually fix Podfile
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.projectRoot, 'ios', 'Podfile');
      let contents = await fs.promises.readFile(podfile, 'utf8');

      // Add global modular headers
      if (!contents.includes("use_modular_headers!")) {
        contents = `use_modular_headers!\n${contents}`;
      }

      // Force static linkage for Firebase
      if (!contents.includes("pod 'FirebaseCore'")) {
        const firebasePods = `
  # Manual Firebase Injection
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseCrashlytics', :modular_headers => true
`;
        contents = contents.replace(/platform :ios, .*/, (match) => `${match}${firebasePods}`);
      }

      // Post-install fixes for Xcode 16
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
