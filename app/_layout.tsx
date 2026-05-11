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
  const [diagnosticStage, setDiagnosticStage] = useState<0 | 1 | 2 | 3>(1);

  useEffect(() => {
    // S2: IF THIS RUNS, WE ARE IN THE EFFECT
    setDiagnosticStage(2);
    
    const timer = setTimeout(() => {
      setDiagnosticStage(3); // S3: IF THIS RUNS, THE EVENT LOOP IS ALIVE
      setPhase('consent');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady && phase !== 'loading') {
    return (
      <BrandedSplashScreen 
        phase={phase}
        diagnosticStage={diagnosticStage}
        onConsent={() => setPhase('downloading')}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

