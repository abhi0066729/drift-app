import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { Suspense, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as SQLite from 'expo-sqlite';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { initDatabase } from '../db/schema';

import { BrandedSplashScreen } from '@/components/BrandedSplashScreen';
import { OpeningTransition } from '@/components/OpeningTransition';
import { ModelDownloadService } from '@/services/ModelDownloadService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [showOpening, setShowOpening] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<'checking' | 'consent' | 'downloading' | 'loading'>('checking');
  
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState<string>('');

  const colorScheme = useColorScheme();
  const initializeSettings = useSettingsStore(state => state.initialize);

  // STEP 1: Logo Animation finished
  const handleOpeningComplete = () => {
    setShowOpening(false);
    // Stagger the next phase to ensure the Logo unmounts cleanly
    setTimeout(() => checkDeployment(), 50);
  };

  /**
   * STARTUP GUARD: Orchestrates the handoff from cinematic intro to AI readiness.
   * Now includes strict timeouts to prevent hangs during filesystem/database checks.
   */
  async function checkDeployment() {
    try {
      console.log('[RootLayout] Firing startup guard...');
      initializeSettings();

      // Step 2: Initialize Database (Mammoth-Scale Optimized)
      const { DatabaseService } = require('@/services/DatabaseService');
      await DatabaseService.getInstance().getDb();
      console.log('[RootLayout] Database heartbeat verified.');
      
      // Step 3: Check AI Models with hard safety timeout
      const modelCheck = ModelDownloadService.getInstance().isModelReady();
      const timeout = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Startup Guard: Model Check Timeout')), 7000)
      );

      const ready = await Promise.race([modelCheck, timeout]).catch((err) => {
        console.warn(`[RootLayout] Model check bypassed: ${err.message}`);
        return false;
      });
      
      if (ready) {
        setPhase('loading');
        // Final transition into the Drift Palace
        setTimeout(() => setIsReady(true), 1200);
      } else {
        // Fallback to consent phase if models are missing or check stalled
        setPhase('consent');
      }
    } catch (e) {
      console.error('[RootLayout] Fatal startup error, emergency bypass to app:', e);
      setIsReady(true);
    }
  }

  async function handleConsent() {
    setPhase('downloading');
    try {
      await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
        setDownloadStatus(`SYNCING ${p.fileName}`);
        setDownloadProgress(p.progress);
        setDownloadSpeed(p.speed);
      });

      setPhase('loading');
      setTimeout(() => setIsReady(true), 1000);
    } catch (e) {
      console.error('[RootLayout] Download flow failed:', e);
      setPhase('consent');
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* 
        PRESERVED CINEMATIC FLOW:
        1. OpeningTransition (Logo) renders ALONE to prevent JS thread lag.
        2. Once done, it unmounts and BrandedSplashScreen (Star check) mounts.
        3. Startup Guard (checkDeployment) runs in the background.
        4. Once models/DB are ready, the main Stack mounts.
      */}
      
      {showOpening ? (
        <OpeningTransition onComplete={handleOpeningComplete} />
      ) : !isReady ? (
        <BrandedSplashScreen
          phase={phase}
          status={downloadStatus}
          progress={downloadProgress}
          speed={downloadSpeed}
          onConsent={handleConsent}
        />
      ) : (
        <Suspense fallback={<View style={{ flex: 1, backgroundColor: '#000000' }} />}>
          <SQLiteProvider databaseName="drift.db">
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="light" translucent />
            </ThemeProvider>
          </SQLiteProvider>
        </Suspense>
      )}
    </GestureHandlerRootView>
  );
}
