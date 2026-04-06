import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';

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
  const theme = useNotesStore(state => state.theme);
  if (!node) return null;

  const noteImage = node.images && node.images.length > 0 ? node.images[0] : null;
  const localAsset = noteImage ? ONBOARDING_ASSETS[noteImage] : null;
  const imageSource = localAsset || (noteImage ? { uri: noteImage } : null);
  
  // Custom high-energy Drop & Bounce animation
  const DropAndBounce = () => {
    'worklet';
    return {
      initialValues: {
        transform: [{ translateY: -500 }, { scale: 0.9 }],
        opacity: 0,
      },
      animations: {
        transform: [
          { translateY: withSpring(0, { damping: 10, stiffness: 95, mass: 1 }) },
          { scale: withSpring(1) }
        ],
        opacity: withSpring(1),
      },
    };
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}
    >
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        activeOpacity={1} 
        onPress={onClose} 
      />
      <Animated.View 
        entering={DropAndBounce}
        exiting={FadeOut.duration(200)}
        pointerEvents="box-none" 
        style={[styles.modalContent, { backgroundColor: theme === 'dark' ? NightTheme.surface : '#FFFFFF' }]}
      >
        <Text style={[styles.noteCategory, { color: CATEGORY_COLORS[node.category] || '#BBBBBB', marginBottom: 16 }]}>
          {node.category?.toUpperCase()} — DRIFT ONBOARDING
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {imageSource && (
            <View style={[styles.imageContainer, { backgroundColor: theme === 'dark' ? NightTheme.surface : '#FFFFFF' }]}>
              <Image 
                source={imageSource} 
                style={styles.image} 
                transition={0} 
                contentFit="contain" 
              />
            </View>
          )}
          <Text style={[styles.noteContent, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>
            {node.content}
          </Text>
        </ScrollView>
      </Animated.View>
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
