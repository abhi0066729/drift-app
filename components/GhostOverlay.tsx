import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CATEGORY_COLORS } from '@/constants/Categories';

interface GhostOverlayProps {
  node: any;
  onClose: () => void;
}

export default function GhostOverlay({ node, onClose }: GhostOverlayProps) {
  if (!node) return null;
  
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}>
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        activeOpacity={1} 
        onPress={onClose} 
      />
      <View pointerEvents="box-none" style={styles.modalContent}>
        <Text style={[styles.noteCategory, { color: CATEGORY_COLORS[node.category] || '#BBBBBB', marginBottom: 12 }]}>
          {node.category?.toUpperCase()} — DRIFT ONBOARDING
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {node.images && node.images.length > 0 && (
            <Image 
              source={{ uri: node.images[0] }} 
              style={styles.image} 
              transition={200} 
              contentFit="cover" 
            />
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
  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  noteContent: { fontSize: 24, fontWeight: '300', lineHeight: 36, color: '#111111' },
});
