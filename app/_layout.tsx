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

  useEffect(() => {
    // Initial check with guaranteed cinematic lead-in
    const checkStatus = async () => {
      const startTime = Date.now();
      const ready = await ModelDownloadService.getInstance().isModelReady();
      
      const elapsed = Date.now() - startTime;
      const minLeadIn = 3000; // 3 seconds minimum for the stars
      const remaining = Math.max(0, minLeadIn - elapsed);

      setTimeout(async () => {
        if (ready) {
          setPhase('loading');
          await finishLoading();
        } else {
          setPhase('consent');
        }
      }, remaining);
    };
    checkStatus();
  }, []);

  async function finishLoading() {
    try {
      initializeSettings();
      // Igniting the core engines
      await SyncService.getInstance().performFullSync();
      // Extra 1s buffer for thread settling
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.warn('[RootLayout] Sync failed:', e);
    }
    setIsReady(true);
  }

  async function handleConsent() {
    setPhase('downloading');
    let lastUpdate = 0;
    try {
      await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
        const now = Date.now();
        if (now - lastUpdate > 100 || p.progress === 1) {
          setDownloadStatus(`SYNCING ${p.fileName}`);
          setDownloadProgress(p.progress);
          setDownloadSpeed(p.speed);
          lastUpdate = now;
        }
      });
      
      setPhase('loading');
      await finishLoading();
    } catch (e) {
      console.error('[RootLayout] Download flow failed:', e);
      setPhase('consent');
    }
  }

  if (!isReady && phase !== 'loading') {
    return (
      <BrandedSplashScreen 
        phase={phase}
        status={downloadStatus}
        progress={downloadProgress}
        speed={downloadSpeed}
        onConsent={handleConsent}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="drift.db" onInit={initDatabase}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} translucent />
        </ThemeProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

