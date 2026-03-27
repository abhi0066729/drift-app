import { Tabs } from 'expo-router';
import React from 'react';
import { Home, PlusCircle, FileText, Users } from 'lucide-react-native';

const PAPER = '#f5f0e8';
const INK_3 = '#7a756b';
const ACCENT = '#c45c2a';
const BORDER = 'rgba(26,24,20,0.12)';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PAPER,
          borderTopColor: BORDER,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INK_3,
        tabBarShowLabel: false,
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
        name="people"
        options={{
          title: 'People',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
