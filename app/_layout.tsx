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
  const [phase, setPhase] = useState<'checking' | 'consent' | 'downloading' | 'loading'>('checking');
  const [downloadStatus, setDownloadStatus] = useState<string>('');
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

    // AGGRESSIVE OTA: Explicitly check for updates on every launch
    async function checkForOTAUpdate() {
      try {
        if (!__DEV__) {
          console.log('[OTA] Checking for updates...');
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('[OTA] Update found! Downloading...');
            await Updates.fetchUpdateAsync();
            console.log('[OTA] Update downloaded. Reloading app...');
            await Updates.reloadAsync();
          } else {
            console.log('[OTA] App is up to date.');
          }
        }
      } catch (e) {
        console.log('[OTA] Update check failed (non-critical):', e);
      }
    }
    checkForOTAUpdate();

    // Check if models are already downloaded
    async function checkModels() {
      try {
        const ready = await ModelDownloadService.getInstance().isModelReady();
        if (ready) {
          console.log('[RootLayout] Models already present, skipping consent.');
          setPhase('loading');
          await finishLoading();
        } else {
          console.log('[RootLayout] Models not found, showing consent.');
          setPhase('consent');
        }
      } catch (e) {
        console.warn('[RootLayout] Model check failed:', e);
        setPhase('consent');
      }
    }
    checkModels();
  }, []);

  async function finishLoading() {
    try {
      await SyncService.getInstance().performFullSync();
    } catch (e) {
      console.warn('[RootLayout] Sync failed:', e);
    }
    setIsReady(true);
  }

  async function handleConsent() {
    setPhase('downloading');
    try {
      setDownloadStatus('CONNECTING TO NEURAL GRID...');
      await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
        setDownloadProgress(p.progress);
        setDownloadSpeed(p.speed);
        setDownloadStatus(`SYNCING ${p.fileName.toUpperCase()}`);
      });
      setPhase('loading');
      setDownloadStatus('');
      await finishLoading();
    } catch (e) {
      console.warn('[RootLayout] Download failed:', e);
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

