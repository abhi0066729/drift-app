import { preloadNavigationAssets } from '@/utils/assetLoader';
import { Tabs } from 'expo-router';
import { FileText, Home, PlusCircle, Activity } from 'lucide-react-native';
import React, { useEffect } from 'react';

const PAPER = '#f5f0e8';
const INK_3 = '#7a756b';
const ACCENT = '#c45c2a';
const BORDER = 'rgba(26,24,20,0.12)';

import KineticTabBar from '@/components/KineticTabBar';

export default function TabLayout() {
  useEffect(() => {
    preloadNavigationAssets();
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
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color }) => <PlusCircle size={24} color={color} />,
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
          title: 'Pulse',
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
