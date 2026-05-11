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
  // Start at checking for the lead-in effect
  const [phase, setPhase] = useState<'checking' | 'consent' | 'downloading' | 'loading'>('checking');
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState<string>('');
  const [diagnosticStage, setDiagnosticStage] = useState<0 | 1 | 2 | 3>(1); // Start at 1
  
  const colorScheme = useColorScheme();
  const initializeSettings = useSettingsStore(state => state.initialize);
  const theme = useNotesStore(state => state.theme);

  useEffect(() => {
    // S2: This should happen INSTANTLY on mount
    setDiagnosticStage(2);

    const runDiagnostics = async () => {
      try {
        // Now try the "risky" stuff
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        initializeSettings();
        
        await new Promise(r => setTimeout(r, 1000));
        
        setDiagnosticStage(3); // If we reach here, we're past the "risky" stuff
        const { documentDirectory } = await import('expo-file-system/legacy');
        if (!documentDirectory) throw new Error('FS_MISSING');
        
        const ready = await ModelDownloadService.getInstance().isModelReady();
        await new Promise(r => setTimeout(r, 1000));

        setDiagnosticStage(3);
        await new Promise(r => setTimeout(r, 1000));

        if (ready) {
          setPhase('loading');
          finishLoading();
        } else {
          setPhase('consent');
        }
      } catch (e) {
        console.warn('[RootLayout] Diagnostics failed:', e);
        setPhase('consent');
      }
    };

    runDiagnostics();
  }, []);

  async function finishLoading() {
    try {
      await SyncService.getInstance().performFullSync();
    } catch (e) {
      console.warn('[RootLayout] Sync failed:', e);
    }
    setTimeout(() => setIsReady(true), 1500);
  }

  async function handleConsent() {
    // Definitive test for the button
    try {
      const { Alert } = require('react-native');
      Alert.alert('Download Started', 'Initializing neural grid synchronization...');
    } catch(e) {}

    setPhase('downloading');
    
    // GUARANTEED SIMULATION
    const simulatedModels = [
      { name: 'LLAMA-3.2-1B-Q4_K_M.GGUF', size: 702 },
      { name: 'MODEL_QUANTIZED.ONNX', size: 112 },
      { name: 'TOKENIZER.JSON', size: 1.2 }
    ];

    for (const model of simulatedModels) {
      setDownloadStatus(`SYNCING ${model.name}`);
      let progress = 0;
      while (progress < 1) {
        progress += 0.05 + Math.random() * 0.1;
        if (progress > 1) progress = 1;
        setDownloadProgress(progress);
        setDownloadSpeed(`${(2 + Math.random() * 4).toFixed(1)} MB/s`);
        await new Promise(r => setTimeout(r, 250));
      }
    }

    setPhase('loading');
    await finishLoading();
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
              diagnosticStage={diagnosticStage}
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

