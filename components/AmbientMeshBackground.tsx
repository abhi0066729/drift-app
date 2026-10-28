import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * AmbientMeshBackground
 * Matches the clean, elegant atmosphere from the Lovable design:
 * `.canvas-atmosphere { background: var(--canvas-wash); }`
 * linear-gradient(145deg, oklch(0.71 0.008 120), oklch(0.85 0.03 120) 60%, oklch(0.9 0.045 310))
 * 
 * Clean, subtle, muted parchment wash without colored orbs/blobs.
 */
export function AmbientMeshBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={['#A1A29D', '#CBD1BB', '#E7D6F5']}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
