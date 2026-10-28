import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';
import { NexusNode } from '@/utils/nexusEngine';

interface ReadingModalProps {
  node: NexusNode;
  onClose: () => void;
  translucent?: boolean;
  searchQuery?: string;
}

export default function ReadingModal({ node, onClose, translucent, searchQuery }: ReadingModalProps) {
  const theme = useNotesStore(state => state.theme);

  // Guard: never render with null node
  if (!node) return null;

  const isDark = theme === 'dark';

  // Safe string extraction with fallbacks
  let finalCategory = '';
  try {
    finalCategory = (node.categories && node.categories.length > 0)
      ? String(node.categories[0] || '')
      : String(node.category || '');
  } catch (_) {}

  let finalEmotion = '';
  try { finalEmotion = String(node.emotion || ''); } catch (_) {}

  let parsedEntities: any = null;
  if (node.entities_json) {
    try {
      parsedEntities = JSON.parse(node.entities_json);
      if (!finalCategory) finalCategory = String(parsedEntities.category || (parsedEntities.categories && parsedEntities.categories[0]) || '');
      if (!finalEmotion) finalEmotion = String(parsedEntities.emotion || '');
    } catch (_) {}
  }

  if (!finalCategory) finalCategory = 'Journal';

  let headerTitle = 'NOTE';
  try {
    headerTitle = finalEmotion
      ? `${finalCategory.toUpperCase()} · ${finalEmotion.toUpperCase()}`
      : finalCategory.toUpperCase();
    if (!headerTitle) headerTitle = 'NOTE';
  } catch (_) {}

  const color = CATEGORY_COLORS[finalCategory] || '#8E44AD';
  const content = node.content ? String(node.content) : '';
  const hasSearch = searchQuery && searchQuery.length > 0;
  const isMatch = hasSearch && (
    content.toLowerCase().includes(searchQuery!.toLowerCase()) ||
    finalCategory.toLowerCase().includes(searchQuery!.toLowerCase())
  );

  const isPage = (node as any)?.note_type === 'page';

  // Reanimated scroll tracking (only used for scroll progress bar — safe, no entering animations)
  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(1);
  const containerHeight = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset?.y ?? 0;
      contentHeight.value = event.contentSize?.height ?? 1;
      containerHeight.value = event.layoutMeasurement?.height ?? 1;
    },
  });

  const progressStyle = useAnimatedStyle(() => {
    'worklet';
    const scrollable = contentHeight.value - containerHeight.value;
    const progress = scrollable > 0 ? scrollY.value / scrollable : 0;
    return {
      width: `${Math.min(Math.max(progress * 100, 0), 100)}%` as any,
    };
  });

  const resonanceKeys = React.useMemo(() => {
    try {
      const res = node?.resonances;
      if (!res || typeof res !== 'object') return [];
      return Object.keys(res).sort((a, b) => ((res[b] as number) || 0) - ((res[a] as number) || 0));
    } catch (_) {
      return [];
    }
  }, [node?.resonances]);

  // ─── PAGE MODE ────────────────────────────────────────────────────────────
  if (isPage) {
    const pageImages: string[] = node.images || parsedEntities?.images || [];
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0A0A0C' : '#F4F4F6' }}>
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pageScrollContent}
          >
            <Text style={[styles.pageMainTitle, { color: isDark ? '#FFF' : '#000' }]}>
              {finalCategory}
            </Text>
            <Text style={[styles.pageBodyContent, { color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }]}>
              {content}
            </Text>

            {pageImages.length > 0 && (
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

            {parsedEntities?.summary && (
              <View style={[styles.synthesisCard, { backgroundColor: isDark ? 'rgba(142,68,173,0.08)' : 'rgba(142,68,173,0.04)', borderColor: isDark ? 'rgba(142,68,173,0.2)' : 'rgba(142,68,173,0.15)' }]}>
                <View style={styles.synthesisCardHeader}>
                  <View style={[styles.synthesisDot, { backgroundColor: '#8E44AD' }]} />
                  <Text style={styles.synthesisTitle}>INTELLIGENCE SYNTHESIS</Text>
                </View>
                <Text style={[styles.synthesisSummary, { color: isDark ? 'rgba(255,255,255,0.9)' : '#333' }]}>
                  {String(parsedEntities.summary)}
                </Text>
                {parsedEntities.cognitive_mode && (
                  <View style={styles.synthesisMetaRow}>
                    <Text style={[styles.synthesisMetaLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : '#666' }]}>COGNITIVE MODE:</Text>
                    <Text style={styles.synthesisMetaVal}>{String(parsedEntities.cognitive_mode)}</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.pageFooterDate, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }]}>
              {node.created_at
                ? new Date(node.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : ''}
            </Text>
          </Animated.ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  // ─── CARD MODE (bottom sheet overlay) ────────────────────────────────────
  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <Pressable style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)' }]} onPress={onClose}>
        {/* Inner pressable to block backdrop press propagation */}
        <Pressable
          style={[styles.contentContainer, { backgroundColor: isDark ? '#0F0F12' : '#FFFFFF' }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: `${color}22` }]}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, opacity: 0.8 }} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: isDark ? 'rgba(255,255,255,0.95)' : '#111111' }]} numberOfLines={1}>
                {headerTitle}
              </Text>
            </View>
            <Pressable style={styles.headerClose} onPress={onClose}>
              <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.noteCard, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }]}>
              {node.images && node.images.length > 0 && (
                <Image
                  source={{ uri: node.images[0] }}
                  style={styles.noteImage}
                  transition={200}
                  contentFit="cover"
                />
              )}
              <Text style={[styles.noteContent, { color: isDark ? 'rgba(255,255,255,0.92)' : '#111111' }]}>
                {content || 'No content available for this note.'}
              </Text>

              <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.footerDate, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
                  {node.created_at
                    ? new Date(node.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''}
                </Text>
              </View>

              {hasSearch && (
                <View style={[styles.contextFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                  <Text style={[styles.contextHeader, { color }]}>SEMANTIC ECHO</Text>
                  <Text style={[styles.contextText, { color: isDark ? NightTheme.textMuted : '#666' }]}>
                    {isMatch
                      ? `This thought resonates directly with your whisper for "${searchQuery}".`
                      : 'This context remains visible to guide your semantic drift.'}
                  </Text>
                </View>
              )}

              {resonanceKeys.length > 1 && (
                <View style={[styles.resonanceInsight, { backgroundColor: isDark ? 'rgba(142,68,173,0.12)' : 'rgba(142,68,173,0.08)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8E44AD', marginRight: 8 }} />
                    <Text style={[styles.contextHeader, { color: '#8E44AD', marginBottom: 0 }]}>RESONANCE INSIGHT</Text>
                  </View>
                  <Text style={[styles.contextText, { color: isDark ? NightTheme.textPrimary : '#444' }]}>
                    This thought is primarily categorized as{' '}
                    <Text style={{ fontWeight: '700' }}>{String(resonanceKeys[0] || finalCategory)}</Text>, and shows resonance with{' '}
                    <Text style={{ fontWeight: '700' }}>{String(resonanceKeys[1] || 'general notes')}</Text>.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  contentContainer: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: 32,
    overflow: 'hidden',
    paddingTop: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerClose: {
    padding: 8,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  progressBarBg: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    paddingVertical: 16,
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
    fontWeight: '300',
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
