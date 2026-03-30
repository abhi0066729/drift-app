import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CATEGORY_COLORS } from '@/constants/Categories';

const ONBOARDING_ASSETS: Record<string, any> = {
  'chronos_nexus_toggle.gif': require('../assets/gifs/chronos_nexus_toggle.gif'),
  'focus_mode_scrub.gif': require('../assets/gifs/focus_mode_scrub.gif'),
  'capture_flow.gif': require('../assets/gifs/capture_flow.gif'),
  'bottom_tab_physics.gif': require('../assets/gifs/bottom_tab_physics.gif'),
};

interface GhostOverlayProps {
  node: any;
  onClose: () => void;
}

export default function GhostOverlay({ node, onClose }: GhostOverlayProps) {
  if (!node) return null;

  const noteImage = node.images && node.images.length > 0 ? node.images[0] : null;
  const localAsset = noteImage ? ONBOARDING_ASSETS[noteImage] : null;
  const imageSource = localAsset || (noteImage ? { uri: noteImage } : null);
  
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}>
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        activeOpacity={1} 
        onPress={onClose} 
      />
      <View pointerEvents="box-none" style={styles.modalContent}>
        <Text style={[styles.noteCategory, { color: CATEGORY_COLORS[node.category] || '#BBBBBB', marginBottom: 16 }]}>
          {node.category?.toUpperCase()} — DRIFT ONBOARDING
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {imageSource && (
            <View style={styles.imageContainer}>
              <Image 
                source={imageSource} 
                style={styles.image} 
                transition={0} 
                contentFit="contain" 
              />
            </View>
          )}
          <Text style={styles.noteContent}>
            {node.content}
          </Text>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    padding: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20
  },
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  imageContainer: { width: '100%', height: 400, borderRadius: 12, overflow: 'hidden', marginBottom: 20, backgroundColor: '#FFFFFF' },
  image: { width: '100%', height: '100%' },
  noteContent: { fontSize: 24, fontWeight: '300', lineHeight: 36, color: '#111111' },
});
