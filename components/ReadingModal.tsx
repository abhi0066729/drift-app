import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';

interface ReadingModalProps {
  node: any;
  onClose: () => void;
  translucent?: boolean;
  searchQuery?: string;
}

export default function ReadingModal({ node, onClose, translucent, searchQuery }: ReadingModalProps) {
  const theme = useNotesStore(state => state.theme);
  if (!node) return null;

  const categoriesText = node.categories ? node.categories.join(' + ') : (node.category || '');
  const color = CATEGORY_COLORS[node.categories?.[0] || node.category] || '#BBBBBB';
  
  // Semantic Echo Logic
  const hasSearch = searchQuery && searchQuery.length > 0;
  const isMatch = hasSearch && (
    node.content.toLowerCase().includes(searchQuery!.toLowerCase()) ||
    node.category?.toLowerCase().includes(searchQuery!.toLowerCase())
  );

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
      <BlurView intensity={translucent ? 30 : 60} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
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
            backgroundColor: translucent ? (theme === 'dark' ? 'rgba(15, 14, 12, 0.94)' : 'rgba(255, 255, 255, 0.94)') : (theme === 'dark' ? NightTheme.surface : '#FFFFFF'), 
            borderRadius: 24, 
            shadowColor: '#000000', 
            shadowOpacity: theme === 'dark' ? 0.3 : 0.1, 
            shadowRadius: 30, 
            elevation: 15,
            borderWidth: translucent ? 1 : 0,
            borderColor: 'rgba(142, 68, 173, 0.1)'
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.noteCategory, { color }]}>{categoriesText} — {translucent ? 'CONTEXT' : 'FOCUS'}</Text>
            {isMatch && (
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>SEARCH ECHO</Text>
              </View>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {node.images && node.images.length > 0 && (
              <Image 
                source={{ uri: node.images[0] }} 
                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }} 
                transition={200} 
                contentFit="cover" 
              />
            )}
            <Text style={[styles.noteContent, { fontSize: 24, lineHeight: 36, color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>{node.content}</Text>
            
            {hasSearch && (
              <View style={[styles.contextFooter, { borderTopColor: theme === 'dark' ? NightTheme.border : '#F0F0F0' }]}>
                <Text style={styles.contextHeader}>SEMANTIC ECHO</Text>
                <Text style={[styles.contextText, { color: theme === 'dark' ? NightTheme.textMuted : '#666666' }]}>
                  {isMatch 
                    ? `This thought resonates directly with your whisper for "${searchQuery}". It is part of your current discovery drift.`
                    : "This context remains visible to guide your semantic drift across the Chronicle."}
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 18, fontWeight: '300', lineHeight: 28, color: '#111111' },
  matchBadge: {
    backgroundColor: 'rgba(142, 68, 173, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  matchBadgeText: {
    fontSize: 8,
    color: '#8E44AD',
    fontWeight: '700',
    letterSpacing: 1,
  },
  contextFooter: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  contextHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E44AD',
    letterSpacing: 2,
    marginBottom: 8,
  },
  contextText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
    fontWeight: '300',
  },
});
