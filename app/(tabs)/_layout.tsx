import { preloadNavigationAssets } from '@/utils/assetLoader';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { FileText, Orbit, Sparkles } from 'lucide-react-native';
import React, { useEffect } from 'react';

const PAPER = '#f5f0e8';
const INK_3 = '#7a756b';
const ACCENT = '#c45c2a';
const BORDER = 'rgba(26,24,20,0.12)';

import KineticTabBar from '@/components/KineticTabBar';

export default function TabLayout() {
  useEffect(() => {
    // preloadNavigationAssets(); // Disabled: 60MB of GIFs causes OOM and startup hangs
  }, []);

  return (
    <Tabs
      tabBar={(props) => <KineticTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Sparkles size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pulse"
        options={{
          title: 'Studio',
          tabBarIcon: ({ color }) => <Orbit size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
