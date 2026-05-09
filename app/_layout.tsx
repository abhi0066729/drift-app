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

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('Initializing...');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  
  const colorScheme = useColorScheme();
  const initializeSettings = useSettingsStore(state => state.initialize);
  const theme = useNotesStore(state => state.theme);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    initializeSettings();

    async function prepare() {
      // Safety Timeout: If sync takes > 15s, just open the app anyway to prevent "App Not Responding"
      const timeout = setTimeout(() => {
        console.warn('[RootLayout] Initialization timed out. Opening app in offline mode.');
        setIsReady(true);
      }, 15000);

      try {
        // 1. Start model downloads
        setDownloadStatus('Awakening Neural Engines...');
        await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
          setDownloadProgress(p.progress);
          setDownloadStatus(`Syncing ${p.fileName.includes('llama') ? 'Llama 3.2' : 'Semantic Engine'}...`);
        });

        // 2. Perform background sync
        setDownloadStatus('Galaxy Synchronized.');
        await SyncService.getInstance().performFullSync();
        
        // Brief pause for cinematic effect
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (e) {
        console.error('[RootLayout] Preparation failed catastrophically:', e);
      } finally {
        clearTimeout(timeout);
        setIsReady(true);
      }
    }


    prepare();
  }, []);

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
