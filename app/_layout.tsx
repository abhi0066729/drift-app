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
import * as Updates from 'expo-updates';

// Nuclear Option: Hide splash immediately on load
SplashScreen.hideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  // NUCLEAR: Start at consent. Background check will skip to loading if models exist.
  const [phase, setPhase] = useState<'consent' | 'downloading' | 'loading'>('consent');
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState<string>('');
  
  const colorScheme = useColorScheme();
  const initializeSettings = useSettingsStore(state => state.initialize);
  const theme = useNotesStore(state => state.theme);

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    initializeSettings();

    // OTA check (fire-and-forget, never blocks)
    if (!__DEV__) {
      Updates.checkForUpdateAsync().then(update => {
        if (update.isAvailable) {
          Updates.fetchUpdateAsync().then(() => Updates.reloadAsync());
        }
      }).catch(() => {});
    }

    // Background model check — if models already exist, skip consent silently
    ModelDownloadService.getInstance().isModelReady().then(ready => {
      if (ready) {
        setPhase('loading');
        finishLoading();
      }
      // If not ready, we're already showing consent — do nothing
    }).catch(() => {
      // Error checking — stay on consent, user can tap to download
    });
  }, []);

  async function finishLoading() {
    try {
      await SyncService.getInstance().performFullSync();
    } catch (e) {
      console.warn('[RootLayout] Sync failed:', e);
    }
    // Give a moment for the loading tips to be seen
    setTimeout(() => setIsReady(true), 1500);
  }

  async function handleConsent() {
    setPhase('downloading');
    try {
      await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
        setDownloadProgress(p.progress);
        setDownloadSpeed(p.speed);
        setDownloadStatus(`SYNCING ${p.fileName.toUpperCase()}`);
      });
      setPhase('loading');
      await finishLoading();
    } catch (e) {
      console.warn('[RootLayout] Download failed:', e);
      setIsReady(true);
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
              phase={phase}
              status={downloadStatus} 
              progress={downloadProgress} 
              speed={downloadSpeed}
              onConsent={handleConsent}
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

