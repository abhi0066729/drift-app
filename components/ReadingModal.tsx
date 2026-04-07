import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';

const { width } = Dimensions.get('window');

interface ReadingModalProps {
  node: any;
  onClose: () => void;
  translucent?: boolean;
  searchQuery?: string;
}

export default function ReadingModal({ node, onClose, translucent, searchQuery }: ReadingModalProps) {
  const theme = useNotesStore(state => state.theme);
  if (!node) return null;

  let finalCategory = (node.categories && node.categories.length > 0) ? node.categories[0] : (node.category || '');
  let finalEmotion = node.emotion || '';
  
  // Robust parsing for nodes from different sources (Chronicle vs Map)
  if (node.entities_json) {
    try {
      const parsed = JSON.parse(node.entities_json);
      if (!finalCategory) finalCategory = parsed.category || (parsed.categories && parsed.categories[0]);
      if (!finalEmotion) finalEmotion = parsed.emotion;
    } catch (e) {}
  }
  
  if (!finalCategory) finalCategory = 'Journal';

  const headerTitle = finalEmotion 
    ? `${finalCategory.toUpperCase()} · ${finalEmotion.toUpperCase()}`
    : finalCategory.toUpperCase();

  const color = CATEGORY_COLORS[finalCategory] || '#8E44AD';
  
  const hasSearch = searchQuery && searchQuery.length > 0;
  const isMatch = hasSearch && (
    node.content.toLowerCase().includes(searchQuery!.toLowerCase()) ||
    node.category?.toLowerCase().includes(searchQuery!.toLowerCase())
  );

  const DropAndBounce = () => {
    'worklet';
    return {
      initialValues: { transform: [{ translateY: -500 }, { scale: 0.9 }], opacity: 0 },
      animations: {
        transform: [
          { translateY: withSpring(0, { damping: 12, stiffness: 100, mass: 1 }) },
          { scale: withSpring(1) }
        ],
        opacity: withSpring(1),
      },
    };
  };

  const isDark = theme === 'dark';

  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(200)} 
      style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={isDark ? 40 : 65} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </Pressable>
      
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
        <Animated.View 
          entering={DropAndBounce}
          exiting={FadeOut.duration(200)}
          style={[styles.contentContainer, { backgroundColor: isDark ? 'rgba(15, 14, 12, 0.85)' : 'rgba(255, 255, 255, 0.75)' }]}
        >
          {/* Header section matching ThoughtCloud avatar+name layout */}
          <View style={styles.header}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: `${color}20` }]}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color, opacity: 0.15 }} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: isDark ? NightTheme.textPrimary : '#111' }]} numberOfLines={1}>{headerTitle}</Text>
              <Text style={[styles.resonanceLabel, { color }]}>
                {isMatch ? 'SEARCH RESONANCE' : (translucent ? 'SEMANTIC ECHO' : 'FOCUS CORE')}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Main Note Card matching ThoughtCloud list items */}
            <View style={[styles.noteCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              {node.images && node.images.length > 0 && (
                <Image 
                  source={{ uri: node.images[0] }} 
                  style={styles.noteImage} 
                  transition={200} 
                  contentFit="cover" 
                />
              )}
              <Text style={[styles.noteContent, { color: isDark ? NightTheme.textPrimary : '#333' }]}>{node.content}</Text>
              
              <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.footerDate, { color: isDark ? NightTheme.textMuted : '#999' }]}>
                  {new Date(node.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>

              {hasSearch && (
                <View style={[styles.contextFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <Text style={[styles.contextHeader, { color }]}>SEMANTIC ECHO</Text>
                  <Text style={[styles.contextText, { color: isDark ? NightTheme.textMuted : '#666' }]}>
                    {isMatch 
                      ? `This thought resonates directly with your whisper for "${searchQuery}".`
                      : "This context remains visible to guide your semantic drift."}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    width: '90%',
    maxHeight: '82%',
    borderRadius: 32,
    overflow: 'hidden',
    paddingTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      }
    }),
    borderWidth: 1,
    borderColor: 'rgba(142, 68, 173, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 68, 173, 0.1)',
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  resonanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  noteCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
  },
  noteImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 20,
  },
  noteContent: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '300',
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerDate: {
    fontSize: 10,
    textAlign: 'right',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  contextFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  contextHeader: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },
  contextText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '300',
  },
});
