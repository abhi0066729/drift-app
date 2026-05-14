import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';

/**
 * GLOBAL LOGGER (Mammoth Scale)
 * Centralized logging that forwards errors to Firebase Crashlytics on native devices.
 */
export class Logger {
  public static log(message: string, context?: Record<string, any>) {
    const logStr = context ? `${message} | ${JSON.stringify(context)}` : message;
    console.log(`[Drift] ${logStr}`);
    
    if (Platform.OS !== 'web') {
      crashlytics().log(logStr);
    }
  }

  public static warn(message: string, context?: Record<string, any>) {
    const logStr = context ? `${message} | ${JSON.stringify(context)}` : message;
    console.warn(`[Drift] ${logStr}`);
    
    if (Platform.OS !== 'web') {
      crashlytics().log(`WARN: ${logStr}`);
    }
  }

  public static error(message: string, error?: any, context?: Record<string, any>) {
    console.error(`[Drift] ${message}`, error, context);
    
    if (Platform.OS !== 'web') {
      crashlytics().log(`ERROR: ${message}`);
      if (context) {
        Object.entries(context).forEach(([key, val]) => {
          crashlytics().setAttribute(key, String(val));
        });
      }
      
      const errorObj = error instanceof Error ? error : new Error(message);
      crashlytics().recordError(errorObj);
    }
  }

  public static setUserId(userId: string) {
    if (Platform.OS !== 'web') {
      crashlytics().setUserId(userId);
    }
  }

  public static setAttribute(key: string, value: string) {
    if (Platform.OS !== 'web') {
      crashlytics().setAttribute(key, value);
    }
  }
}
