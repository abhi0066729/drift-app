import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { CATEGORY_COLORS } from '@/constants/Categories';

interface ReadingModalProps {
  node: any;
  onClose: () => void;
}

export default function ReadingModal({ node, onClose }: ReadingModalProps) {
  if (!node) return null;

  const categoriesText = node.categories ? node.categories.join(' + ') : (node.category || '');
  const color = CATEGORY_COLORS[node.categories?.[0] || node.category] || '#BBBBBB';

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
      style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
    >
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </BlurView>
      
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
        <Animated.View 
          entering={DropAndBounce}
          exiting={FadeOut.duration(200)}
          pointerEvents="box-none" 
          style={{ 
            width: '88%', 
            maxHeight: '75%', 
            padding: 36, 
            backgroundColor: '#FFFFFF', 
            borderRadius: 24, 
            shadowColor: '#000000', 
            shadowOpacity: 0.1, 
            shadowRadius: 30, 
            elevation: 15 
          }}
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
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 18, fontWeight: '300', lineHeight: 28, color: '#111111' },
});
