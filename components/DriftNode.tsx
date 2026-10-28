/**
 * DriftNode — Safe multi-gesture implementation with stack animations.
 *
 * Gesture layers (crash-safe, no double-dispatch):
 *  1. Tap            → <Pressable onPress>       JS thread — opens note
 *  2. Long-press     → <Pressable onLongPress>   JS thread — action menu + shuffle (500ms)
 *  3. Drag/move      → Gesture.Pan + activateAfterLongPress(800ms)
 *                      Pure worklet — only writes shared values, NO runOnJS, NO node object access
 *                      Card snaps back to original position on release.
 *
 * Stack animations:
 *  - 3 underlay cards behind the top card with gentle idle shuffle loop
 *  - Long press on a stack triggers rapid shuffle sequence (withSequence, JS thread safe)
 *  - All driven by shuffleProgress SharedValue → pure worklet useAnimatedStyle math
 */
import React, { memo, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Image, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface DriftNodeProps {
  node: any;
  onPress: (node: any, type: 'dot' | 'text') => void;
  theme?: 'light' | 'dark';
  onLongPressMenu?: (node: any) => void;
  parentPanGesture?: any;
  stackCount?: number;
  // Legacy compat (unused)
  activeDragX?: any;
  activeDragY?: any;
  draggedNodeId?: any;
  proximityTargetId?: any;
  proximitySide?: any;
  cards?: any[];
  activeView?: string;
  searchStatus?: string;
  isFirst?: boolean;
  onEjectCard?: (nodeId: string) => void;
  onDragEnd?: (nodeId: string, targetId: string) => void;
}

const getCardDimensions = (source_type: string) => {
  switch (source_type) {
    case 'todo': return { width: 160, height: 120 };
    case 'document': return { width: 160, height: 76 };
    case 'moodboard': return { width: 180, height: 134 };
    case 'link': return { width: 170, height: 82 };
    case 'image': return { width: 180, height: 180 };
    default: return { width: 150, height: 88 };
  }
};

function DriftNode({
  node,
  onPress,
  theme = 'light',
  onLongPressMenu,
  parentPanGesture,
  stackCount = 1,
}: DriftNodeProps) {
  const isDark = theme === 'dark';
  const isOrangeCard = node?.id === 'card-2';

  const initialX: number = node?.unfocusedX || 0;
  const initialY: number = node?.unfocusedY || 0;

  const cardBorderRadius = useMemo(() => {
    let hash = 0;
    const safeId = String(node?.id || 'node');
    for (let i = 0; i < safeId.length; i++) {
      hash = safeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 16 + (Math.abs(hash) % 3) * 4;
  }, [node?.id]);

  const rotationAngle = useMemo(() => {
    let hash = 0;
    const safeId = String(node?.id || 'node');
    for (let i = 0; i < safeId.length; i++) {
      hash = safeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (hash % 40) / 10 - 2.0;
  }, [node?.id]);

  const cardDim = getCardDimensions(node?.source_type || 'text');

  // ── Stack shuffle animation ────────────────────────────────────────────────
  // shuffleProgress drives all 3 underlay card positions via pure worklet math.
  // Setting .value from JS thread (useEffect / triggerStackShuffle) is safe.
  const shuffleProgress = useSharedValue(0);

  useEffect(() => {
    if (stackCount > 1) {
      // Gentle idle breathing loop
      shuffleProgress.value = withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      shuffleProgress.value = withTiming(0, { duration: 300 });
    }
  }, [stackCount]);

  // Called from JS thread (Pressable.onLongPress) — completely safe
  const triggerStackShuffle = () => {
    // Rapid shuffle sequence, then return to idle loop
    shuffleProgress.value = withSequence(
      withTiming(1,   { duration: 110 }),
      withTiming(0,   { duration: 110 }),
      withTiming(1,   { duration: 110 }),
      withTiming(0,   { duration: 110 }),
      withTiming(1,   { duration: 110 }),
      withTiming(0.5, { duration: 180 }),
      // Resume idle loop after shuffle
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  };

  // Pure worklet math — only reads shuffleProgress.value (a shared value)
  const underlayDeepStyle = useAnimatedStyle(() => {
    'worklet';
    const shift = shuffleProgress.value * 4;
    return {
      transform: [
        { scale: 0.93 },
        { translateX: -10 - shift },
        { translateY: 10 + shift },
        { rotate: `${-3.5 + shift * 0.4}deg` },
      ],
    };
  });

  const underlayMidStyle = useAnimatedStyle(() => {
    'worklet';
    const shift = shuffleProgress.value * 3;
    return {
      transform: [
        { scale: 0.96 },
        { translateX: -4 + shift },
        { translateY: 6 - shift * 0.3 },
        { rotate: `${-1.5 - shift * 0.3}deg` },
      ],
    };
  });

  const underlayTopStyle = useAnimatedStyle(() => {
    'worklet';
    const shift = shuffleProgress.value * 5;
    return {
      transform: [
        { scale: 0.98 },
        { translateX: 12 + shift },
        { translateY: -6 - shift * 0.4 },
        { rotate: `${4.5 + shift * 0.5}deg` },
      ],
    };
  });

  // ── Drag shared values ─────────────────────────────────────────────────────
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const startDragX = useSharedValue(0);
  const startDragY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // ── Drag gesture: activates after holding 800ms then moving ───────────────
  // WORKLET SAFETY: Only shared value reads/writes + event primitives. No runOnJS. No node access.
  let dragGesture = Gesture.Pan()
    .activateAfterLongPress(800)
    .minDistance(4);

  if (parentPanGesture) {
    dragGesture = dragGesture.blocksExternalGesture(parentPanGesture);
  }

  dragGesture = dragGesture
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      startDragX.value = dragX.value;
      startDragY.value = dragY.value;
    })
    .onUpdate((event) => {
      'worklet';
      dragX.value = startDragX.value + event.translationX;
      dragY.value = startDragY.value + event.translationY;
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      dragX.value = withSpring(0, { damping: 20, stiffness: 120 });
      dragY.value = withSpring(0, { damping: 20, stiffness: 120 });
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      dragX.value = withSpring(0, { damping: 20, stiffness: 120 });
      dragY.value = withSpring(0, { damping: 20, stiffness: 120 });
    });

  // ── Card animated style ────────────────────────────────────────────────────
  const cardStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: dragX.value },
        { translateY: dragY.value },
        { rotate: `${rotationAngle}deg` },
        { scale: withSpring(isDragging.value ? 1.06 : 1.0, { damping: 18 }) },
      ],
      zIndex: isDragging.value ? 999 : 10,
      shadowOpacity: withSpring(isDragging.value ? 0.48 : 0.28, { damping: 15 }),
      shadowRadius: withSpring(isDragging.value ? 22 : 10, { damping: 15 }),
    };
  });

  // ── JS-thread Pressable handlers ───────────────────────────────────────────
  const handleTap = () => {
    try {
      if (onPress && node) {
        setTimeout(() => onPress({ ...node }, 'text'), 0);
      }
    } catch (_) {}
  };

  const handleLongPress = () => {
    try {
      // 1. If it's a stack → play shuffle animation first
      if (stackCount > 1) {
        triggerStackShuffle();
      }
      // 2. Open action menu
      if (onLongPressMenu && node) {
        setTimeout(() => onLongPressMenu({ ...node }), 0);
      }
    } catch (_) {}
  };

  // ── Card content renderer ──────────────────────────────────────────────────
  const renderCardContent = () => {
    switch (node?.source_type) {
      case 'todo':
        return (
          <View style={styles.todoCard}>
            <Text style={styles.todoTitle}>{node.content || 'Tasks'}</Text>
            {node.items && node.items.map((item: any, idx: number) => (
              <View key={idx} style={styles.todoRow}>
                <View style={[styles.todoCheck, item.completed && styles.todoCheckActive]}>
                  {item.completed && <Ionicons name="checkmark" size={8} color="#FFFFFF" />}
                </View>
                <Text style={[styles.todoItemText, item.completed && styles.todoItemTextCompleted]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        );

      case 'document':
        return (
          <View style={styles.docCard}>
            <View style={styles.docPill}><Text style={styles.docPillText}>PDF</Text></View>
            <View style={styles.docHeader}>
              <Ionicons name="document-text-outline" size={16} color="#E8673C" style={{ marginRight: 6 }} />
              <Text style={styles.docTitle} numberOfLines={1}>{node.content}</Text>
            </View>
            <Text style={styles.docMeta}>{node.meta || 'dribbble.com · 2.4MB'}</Text>
          </View>
        );

      case 'map':
        return (
          <View style={styles.mapCard}>
            <View style={styles.mapPreview}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80' }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              <View style={styles.mapPin}><Ionicons name="location" size={14} color="#E8673C" /></View>
            </View>
            <View style={styles.mapMeta}>
              <Text style={styles.mapTitle} numberOfLines={1}>{node.content}</Text>
              <Text style={styles.mapTime}>{node.date || 'May 14'}</Text>
            </View>
          </View>
        );

      case 'moodboard':
        return (
          <View style={styles.moodboardCard}>
            <Text style={styles.moodboardTitle}>{node.content}</Text>
            <View style={styles.moodboardGrid}>
              {node.images && node.images.slice(0, 4).map((img: string, idx: number) => (
                <Image key={idx} source={{ uri: img }} style={styles.moodboardThumb} resizeMode="cover" />
              ))}
            </View>
            <Text style={styles.moodboardMeta}>{node.itemsCount || '12 items'}</Text>
          </View>
        );

      case 'link':
        return (
          <View style={styles.linkCard}>
            <View style={styles.linkHeader}>
              <Ionicons name="link" size={12} color="#E8673C" style={{ marginRight: 6 }} />
              <Text style={styles.linkUrl} numberOfLines={1}>{node.content}</Text>
            </View>
            <Text style={styles.linkTitle} numberOfLines={1}>{node.title || 'IMDb: Ratings & Reviews'}</Text>
            <Text style={styles.linkTime}>{node.date || 'May 15'}</Text>
          </View>
        );

      case 'image':
        return (
          <View style={[styles.photoCard, { height: 180, width: 180 }]}>
            <Image
              source={{ uri: node.content_image }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: cardBorderRadius }]}
              resizeMode="cover"
            />
            <View style={styles.photoGlassOverlay}>
              <BlurView
                experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
                intensity={30}
                style={StyleSheet.absoluteFillObject}
                tint="dark"
              />
              <View style={styles.photoHeader}>
                <Ionicons name="image-outline" size={12} color="#E8673C" style={{ marginRight: 6 }} />
                <Text style={styles.photoTitle} numberOfLines={1}>{node.content}</Text>
              </View>
              <Text style={styles.photoTime}>{node.date || 'Today'}</Text>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.textCard}>
            <Text style={styles.textCategory}>{node?.category || 'Journal'}</Text>
            <Text style={styles.textContent}>{node?.content}</Text>
            <Text style={styles.textDate}>{node?.date || 'Today'}</Text>
          </View>
        );
    }
  };

  return (
    <Animated.View style={[styles.cardWrapper, { left: initialX, top: initialY }, cardStyle]}>

      {/* ── Stack underlay cards ─────────────────────────────────────────── */}
      {stackCount > 1 && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stackUnderlay,
              styles.stackUnderlayDeep,
              { width: cardDim.width, height: cardDim.height, borderRadius: cardBorderRadius },
              underlayDeepStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stackUnderlay,
              styles.stackUnderlayMid,
              { width: cardDim.width, height: cardDim.height, borderRadius: cardBorderRadius },
              underlayMidStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stackUnderlay,
              styles.stackUnderlayTop,
              { width: cardDim.width, height: cardDim.height, borderRadius: cardBorderRadius },
              underlayTopStyle,
            ]}
          />
        </>
      )}

      {/* Stack count badge */}
      {stackCount > 1 && (
        <View style={styles.stackBadge}>
          <Text style={styles.stackBadgeText}>{stackCount} STACKED</Text>
        </View>
      )}

      {/* ── Main card: GestureDetector for drag, Pressable for tap/menu ──── */}
      <GestureDetector gesture={dragGesture}>
        <Pressable
          onPress={handleTap}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={[
            styles.cardInner,
            {
              borderRadius: cardBorderRadius,
              backgroundColor: isOrangeCard
                ? '#E8673C'
                : isDark
                  ? 'rgba(15, 15, 18, 0.42)'
                  : 'rgba(255, 255, 255, 0.58)',
            },
          ]}
        >
          {!isOrangeCard && (
            <BlurView
              experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
              intensity={isDark ? 55 : 85}
              style={StyleSheet.absoluteFillObject}
              tint={isDark ? 'dark' : 'light'}
            />
          )}
          {!isOrangeCard && (
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0)']
                  : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <View
            pointerEvents="none"
            style={[
              styles.cardBorderOverlay,
              {
                borderRadius: cardBorderRadius,
                borderColor: isOrangeCard
                  ? '#FF8F6B'
                  : isDark
                    ? 'rgba(255, 255, 255, 0.14)'
                    : 'rgba(255, 255, 255, 0.75)',
                borderWidth: 1.5,
              },
            ]}
          />
          {renderCardContent()}
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}

export default memo(DriftNode);

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  cardInner: {
    overflow: 'hidden',
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // Stack underlay cards
  stackUnderlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  stackUnderlayDeep: {
    backgroundColor: 'rgba(12, 12, 16, 0.65)',
    zIndex: 1,
  },
  stackUnderlayMid: {
    backgroundColor: 'rgba(18, 18, 24, 0.78)',
    zIndex: 2,
  },
  stackUnderlayTop: {
    backgroundColor: 'rgba(24, 24, 30, 0.88)',
    zIndex: 3,
  },
  stackBadge: {
    position: 'absolute',
    top: -10,
    right: 4,
    backgroundColor: 'rgba(232, 103, 60, 0.92)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 20,
  },
  stackBadgeText: {
    fontSize: 7,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Photo card
  photoGlassOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  photoCard: { overflow: 'hidden' },
  photoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  photoTitle: { fontSize: 10, color: '#FFFFFF', fontWeight: '600', flex: 1 },
  photoTime: { fontSize: 8, color: 'rgba(255,255,255,0.5)' },
  // Todo card
  todoCard: { width: 160, padding: 14 },
  todoTitle: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', marginBottom: 10 },
  todoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  todoCheck: { width: 13, height: 13, borderRadius: 3.5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  todoCheckActive: { borderColor: '#E8673C', backgroundColor: '#E8673C' },
  todoItemText: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  todoItemTextCompleted: { color: 'rgba(255,255,255,0.35)', textDecorationLine: 'line-through' },
  // Doc card
  docCard: { width: 160, padding: 14 },
  docPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(232,103,60,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 8 },
  docPillText: { fontSize: 8, color: '#E8673C', fontWeight: '700' },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  docTitle: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', flex: 1 },
  docMeta: { fontSize: 9, color: 'rgba(255,255,255,0.45)' },
  // Map card
  mapCard: { width: 160 },
  mapPreview: { height: 95, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#1E1E24', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mapPin: { backgroundColor: '#1A1A1E', padding: 6, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mapMeta: { padding: 10 },
  mapTitle: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  mapTime: { fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  // Moodboard card
  moodboardCard: { width: 180, padding: 12 },
  moodboardTitle: { fontSize: 11, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  moodboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 6 },
  moodboardThumb: { width: 72, height: 52, borderRadius: 6 },
  moodboardMeta: { fontSize: 8, color: 'rgba(255,255,255,0.4)' },
  // Link card
  linkCard: { width: 170, padding: 14 },
  linkHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  linkUrl: { fontSize: 9, color: '#E8673C', flex: 1 },
  linkTitle: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  linkTime: { fontSize: 8, color: 'rgba(255,255,255,0.35)' },
  // Text card
  textCard: { width: 150, padding: 14 },
  textCategory: { fontSize: 8, fontWeight: '700', color: '#E8673C', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  textContent: { fontSize: 12, color: '#FFFFFF', lineHeight: 18, fontWeight: '300', marginBottom: 8 },
  textDate: { fontSize: 8, color: 'rgba(255,255,255,0.35)' },
});
