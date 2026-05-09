import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, UIManager } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDatabase } from '../db/schema';
import { useSettingsStore } from '@/store/useSettingsStore';

import * as SystemUI from 'expo-system-ui';
import { useNotesStore } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { SyncService } from '@/services/SyncService';
import { ModelDownloadService } from '@/services/ModelDownloadService';
import { BrandedSplashScreen } from '@/components/BrandedSplashScreen';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';

// Nuclear Option: Hide splash immediately on load
SplashScreen.hideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('IGNITING ENGINES...');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState<string>('');
  
  const colorScheme = useColorScheme();
  const initializeSettings = useSettingsStore(state => state.initialize);
  const theme = useNotesStore(state => state.theme);

  useEffect(() => {
    // Immediate haptic confirmation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    initializeSettings();

    async function checkModels() {
      // Force popup after 2 seconds if check is slow
      const forcePopup = setTimeout(() => {
        if (!isReady) setNeedsConsent(true);
      }, 2000);

      try {
        const ready = await ModelDownloadService.getInstance().isModelReady();
        clearTimeout(forcePopup);
        if (!ready) {
          setNeedsConsent(true);
        } else {
          prepare();
        }
      } catch (err) {
        setNeedsConsent(true);
      }
    }
    checkModels();
  }, []);

  async function prepare() {
    setNeedsConsent(false);
    try {
      setDownloadStatus('CONNECTING TO NEURAL GRID...');
      await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
        setDownloadProgress(p.progress);
        setDownloadSpeed(p.speed);
        setDownloadStatus(`SYNCING ${p.fileName.toUpperCase()}`);
      });
      await SyncService.getInstance().performFullSync();
      setIsReady(true);
    } catch (e) {
      console.warn('[RootLayout] Preparation failed:', e);
      setIsReady(true); // Fail safe: enter app anyway
    }
  }

  useEffect(() => {
    const bgColor = theme === 'dark' ? NightTheme.background : '#FFFFFF';
    SystemUI.setBackgroundColorAsync(bgColor);
  }, [theme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="drift.db" onInit={initDatabase}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {!isReady ? (
            <BrandedSplashScreen 
              status={downloadStatus} 
              progress={downloadProgress} 
              speed={downloadSpeed}
              needsConsent={needsConsent}
              onConsent={prepare}
            />
          ) : (
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
          )}
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} translucent />
        </ThemeProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
