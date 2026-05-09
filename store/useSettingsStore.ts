import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

interface SettingsState {
  app_id: string;
  isInitialized: boolean;
  initialize: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      app_id: '',
      isInitialized: false,
      initialize: () => {
        if (get().isInitialized) return;
        try {
          const newId = Crypto.randomUUID();
          set({ app_id: newId, isInitialized: true });
        } catch (e) {
          // Fallback if Crypto is not available (e.g. non-HTTPS web)
          const fallbackId = 'drift-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          set({ app_id: fallbackId, isInitialized: true });
        }
      },
    }),
    {
      name: 'drift-settings-storage',
      storage: createJSONStorage(() => 
        Platform.OS === 'web' ? window.localStorage : AsyncStorage as any
      ),
    }
  )
);
