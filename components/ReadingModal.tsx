import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  withSpring, 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle 
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';

import { NexusNode } from '@/utils/nexusEngine';

const { width } = Dimensions.get('window');

interface ReadingModalProps {
  node: NexusNode;
  onClose: () => void;
  translucent?: boolean;
  searchQuery?: string;
}

export default function ReadingModal({ node, onClose, translucent, searchQuery }: ReadingModalProps) {
  const theme = useNotesStore(state => state.theme);
  if (!node) return null;

  let finalCategory = (node.categories && node.categories.length > 0) ? node.categories[0] : (node.category || '');
  let finalEmotion = node.emotion || '';
  let parsedEntities: any = null;
  
  // Robust parsing for nodes from different sources (Chronicle vs Map)
  if (node.entities_json) {
    try {
      parsedEntities = JSON.parse(node.entities_json);
      if (!finalCategory) finalCategory = parsedEntities.category || (parsedEntities.categories && parsedEntities.categories[0]);
      if (!finalEmotion) finalEmotion = parsedEntities.emotion;
    } catch (e) {}
  }
  
  if (!finalCategory) finalCategory = 'Journal';

  const headerTitle = (finalEmotion 
    ? `${finalCategory.toUpperCase()} · ${finalEmotion.toUpperCase()}`
    : finalCategory.toUpperCase()) || 'NOTE';

  const color = CATEGORY_COLORS[finalCategory] || '#8E44AD';
  
  const content = node.content || '';
  const hasSearch = searchQuery && searchQuery.length > 0;
  const isMatch = hasSearch && (
    content.toLowerCase().includes(searchQuery!.toLowerCase()) ||
    finalCategory.toLowerCase().includes(searchQuery!.toLowerCase())
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
  const isPage = node.note_type === 'page';

  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(1);
  const containerHeight = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const progressStyle = useAnimatedStyle(() => {
    const scrollable = contentHeight.value - containerHeight.value;
    const progress = scrollable > 0 ? scrollY.value / scrollable : 0;
    return {
      width: `${Math.min(Math.max(progress * 100, 0), 100)}%`,
    };
  });

  if (isPage) {
    const pageImages = node.images || parsedEntities?.images || [];
    return (
      <Animated.View 
        entering={FadeIn.duration(300)} 
        exiting={FadeOut.duration(200)} 
        style={[StyleSheet.absoluteFill, { zIndex: 1000, backgroundColor: isDark ? '#0A0A0C' : '#F4F4F6' }]}
      >
        {/* Scroll Progress Bar */}
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { backgroundColor: color }, progressStyle]} />
        </View>

        {/* Close Button Header */}
        <View style={[styles.pageHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.pageHeaderTitle, { color: isDark ? 'rgba(255,255,255,0.9)' : '#111' }]}>{headerTitle}</Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }]}>✕ Close</Text>
          </Pressable>
        </View>

        <Animated.ScrollView 
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onContentSizeChange={(w, h) => { contentHeight.value = h; }}
          onLayout={(e) => { containerHeight.value = e.nativeEvent.layout.height; }}
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.pageScrollContent}
        >
          {/* Title */}
          <Text style={[styles.pageMainTitle, { color: isDark ? '#FFF' : '#000' }]}>
            {finalCategory}
          </Text>

          {/* Premium Body Text */}
          <Text style={[styles.pageBodyContent, { color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }]}>
            {content}
          </Text>

          {/* Image Grid Display */}
          {pageImages && pageImages.length > 0 && (
            <View style={styles.imageGrid}>
              {pageImages.map((imgUri: string, idx: number) => (
                <Image 
                  key={imgUri + '-' + idx} 
                  source={{ uri: imgUri }} 
                  style={[
                    styles.gridImage, 
                    pageImages.length === 1 && styles.gridImageSingle,
                    pageImages.length === 2 && styles.gridImageDouble,
                  ]} 
                  contentFit="cover" 
                  transition={200}
                />
              ))}
            </View>
          )}

          {/* Synthesis Card */}
          {parsedEntities?.summary && (
            <View style={[styles.synthesisCard, { backgroundColor: isDark ? 'rgba(142, 68, 173, 0.08)' : 'rgba(142, 68, 173, 0.04)', borderColor: isDark ? 'rgba(142, 68, 173, 0.2)' : 'rgba(142, 68, 173, 0.15)' }]}>
              <View style={styles.synthesisCardHeader}>
                <View style={[styles.synthesisDot, { backgroundColor: '#8E44AD' }]} />
                <Text style={styles.synthesisTitle}>INTELLIGENCE SYNTHESIS</Text>
              </View>
              <Text style={[styles.synthesisSummary, { color: isDark ? 'rgba(255,255,255,0.9)' : '#333' }]}>
                {parsedEntities.summary}
              </Text>
              {parsedEntities.cognitive_mode && (
                <View style={styles.synthesisMetaRow}>
                  <Text style={[styles.synthesisMetaLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : '#666' }]}>COGNITIVE MODE:</Text>
                  <Text style={styles.synthesisMetaVal}>{parsedEntities.cognitive_mode}</Text>
                </View>
              )}
            </View>
          )}

          {/* Footer Date */}
          <Text style={[styles.pageFooterDate, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }]}>
            Captured on {new Date(node.created_at || Date.now()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Animated.ScrollView>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      exiting={FadeOut.duration(200)} 
      style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      </Pressable>
      
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="box-none">
        <Animated.View 
          entering={DropAndBounce}
          exiting={FadeOut.duration(200)}
          style={[styles.contentContainer, { backgroundColor: 'transparent' }]}
        >
          <BlurView 
            intensity={80} 
            tint={isDark ? "dark" : "light"} 
            style={StyleSheet.absoluteFill} 
          />
          
          <View style={{ flexShrink: 1, paddingVertical: 24 }}>
            {/* Header section matching ThoughtCloud avatar+name layout */}
            <View style={styles.header}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${color}20` }]}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color, opacity: 0.25 }} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: isDark ? 'rgba(255,255,255,0.95)' : '#111111' }]} numberOfLines={1}>{headerTitle}</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Main Note Card matching ThoughtCloud list items */}
              <View style={[styles.noteCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                {node.images && node.images.length > 0 && (
                  <Image 
                    source={{ uri: node.images[0] }} 
                    style={styles.noteImage} 
                    transition={200} 
                    contentFit="cover" 
                  />
                )}
                <Text style={[styles.noteContent, { color: isDark ? 'rgba(255,255,255,0.9)' : '#111111' }]}>
                  {content || 'No content available for this note.'}
                </Text>
                
                <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                  <Text style={[styles.footerDate, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
                    {new Date(node.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>

                {hasSearch && (
                  <View style={[styles.contextFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                    <Text style={[styles.contextHeader, { color }]}>SEMANTIC ECHO</Text>
                    <Text style={[styles.contextText, { color: isDark ? NightTheme.textMuted : '#666' }]}>
                      {isMatch 
                        ? `This thought resonates directly with your whisper for "${searchQuery}".`
                        : "This context remains visible to guide your semantic drift."}
                    </Text>
                  </View>
                )}

                {/* RESONANCE INSIGHT: The 'Purple Context' section */}
                {Object.keys(node.resonances || {}).length > 1 && (
                  <View style={[styles.resonanceInsight, { backgroundColor: isDark ? 'rgba(142, 68, 173, 0.12)' : 'rgba(142, 68, 173, 0.08)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8E44AD', marginRight: 8 }} />
                      <Text style={[styles.contextHeader, { color: '#8E44AD', marginBottom: 0 }]}>RESONANCE INSIGHT</Text>
                    </View>
                    <Text style={[styles.contextText, { color: isDark ? NightTheme.textPrimary : '#444' }]}>
                      This thought is primarily categorized as <Text style={{ fontWeight: '700' }}>{Object.keys(node.resonances || {}).sort((a,b) => (node.resonances?.[b] ?? 0) - (node.resonances?.[a] ?? 0))[0]}</Text>, 
                      but it also shows a strong resonance with <Text style={{ fontWeight: '700' }}>{Object.keys(node.resonances || {}).sort((a,b) => (node.resonances?.[b] ?? 0) - (node.resonances?.[a] ?? 0))[1]}</Text>.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
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
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  subconsciousHeader: {
    fontSize: 7,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1.5,
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
  resonanceInsight: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 68, 173, 0.15)',
  },
  echoChainContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.1)',
  },
  echoHeader: {
    marginBottom: 20,
  },
  echoSubtitle: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  echoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  echoTimeline: {
    width: 20,
    alignItems: 'center',
  },
  echoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  echoLine: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    marginVertical: 4,
  },
  echoContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  echoDate: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  echoSnippet: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '300',
  },
  progressBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    zIndex: 1100,
  },
  progressBarFill: {
    height: '100%',
    width: 0,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  pageHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pageScrollContent: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 80,
  },
  pageMainTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  pageBodyContent: {
    fontSize: 18,
    lineHeight: 32,
    fontWeight: '350',
    letterSpacing: 0.2,
    marginBottom: 32,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  gridImage: {
    width: '48%',
    height: 180,
    borderRadius: 16,
  },
  gridImageSingle: {
    width: '100%',
    height: 280,
  },
  gridImageDouble: {
    width: '48%',
    height: 220,
  },
  synthesisCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 40,
  },
  synthesisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  synthesisDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  synthesisTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#8E44AD',
  },
  synthesisSummary: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '300',
    marginBottom: 16,
  },
  synthesisMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  synthesisMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginRight: 8,
  },
  synthesisMetaVal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E44AD',
  },
  pageFooterDate: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 20,
  },
});
