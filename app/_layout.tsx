import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect } from 'react';
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
import SyncOverlay from '@/components/SyncOverlay';
import { useState } from 'react';

import { BrandedSplashScreen } from '@/components/BrandedSplashScreen';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);
  const [downloadStatus, setDownloadStatus] = React.useState<string>('Initializing...');
  const [downloadProgress, setDownloadProgress] = React.useState<number>(0);
  
  const colorScheme = useColorScheme();
  const initializeSettings = useSettingsStore(state => state.initialize);
  const theme = useNotesStore(state => state.theme);

    }, 6500); // 6.5s to allow for full sequence + fade

    // 2. --- THE PRE-FLIGHT SYNC ---
    (async () => {
      try {
        await SyncService.getInstance().performFullSync();
        setIsSynced(true);
      } catch (err) {
        console.error('[RootLayout] Sync failed:', err);
        setIsSynced(true);
      }
    })();
  }, []);

  useEffect(() => {
    const bgColor = theme === 'dark' ? NightTheme.background : '#FFFFFF';
    SystemUI.setBackgroundColorAsync(bgColor);
  }, [theme]);

  // Determine if we should show the entry Palace
  const showPalace = !isSplashDone || !isSynced;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="drift.db" onInit={initDatabase}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {showPalace ? (
            <BrandedSplashScreen />
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


