import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CATEGORY_COLORS } from '@/constants/Categories';

interface ReadingModalProps {
  node: any;
  onClose: () => void;
}

export default function ReadingModal({ node, onClose }: ReadingModalProps) {
  if (!node) return null;

  const categoriesText = node.categories ? node.categories.join(' + ') : (node.category || '');
  const color = CATEGORY_COLORS[node.categories?.[0] || node.category] || '#BBBBBB';

  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(200)} 
      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.92)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View 
        entering={SlideInUp.duration(300).springify().damping(20).stiffness(90)}
        exiting={SlideOutDown.duration(200)}
        pointerEvents="box-none" 
        style={{ width: '85%', maxHeight: '70%', padding: 36, backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 30, elevation: 10 }}
      >
        <Text style={[styles.noteCategory, { color, marginBottom: 12 }]}>{categoriesText} — FOCUS</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {node.images && node.images.length > 0 && (
            <Image 
              source={{ uri: node.images[0] }} 
              style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }} 
              transition={200} 
              contentFit="cover" 
            />
          )}
          <Text style={[styles.noteContent, { fontSize: 24, lineHeight: 36 }]}>{node.content}</Text>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 18, fontWeight: '300', lineHeight: 28, color: '#111111' },
});
