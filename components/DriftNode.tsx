import React, { useEffect, memo, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Image, Platform, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  Easing, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSpring, 
  runOnJS, 
  type SharedValue 
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNotesStore } from '@/store/useNotesStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface DriftNodeProps {
  node: any;
  onPress: (node: any, type: 'dot' | 'text') => void;
  activeDragX?: SharedValue<number>;
  activeDragY?: SharedValue<number>;
  draggedNodeId?: SharedValue<string | null>;
  theme?: 'light' | 'dark';
  activeView?: string;
  searchStatus?: string;
  isFirst?: boolean;
  onLongPressMenu?: (node: any) => void;
  onEjectCard?: (nodeId: string) => void;
}

function DriftNode({ 
  node, 
  onPress, 
  activeDragX, 
  activeDragY, 
  draggedNodeId, 
  theme = 'light',
  activeView,
  searchStatus = 'none',
  isFirst,
  onLongPressMenu,
  onEjectCard
}: DriftNodeProps) {
  const isDraggingLocal = useSharedValue(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  
  // Custom Card scale for resizing
  const cardScale = useSharedValue(1.0);
  const startCardScale = useSharedValue(1.0);

  // Tilt physics values
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  // Position setup
  const initialX = node.unfocusedX || 0;
  const initialY = node.unfocusedY || 0;
  
  const rotationAngle = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++) {
      hash = node.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (hash % 40) / 10 - 2.0; 
  }, [node.id]);

  const cardBorderRadius = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++) {
      hash = node.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 16 + (Math.abs(hash) % 3) * 4; 
  }, [node.id]);

  // Gestures definitions
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      isDraggingLocal.value = true;
      if (draggedNodeId) draggedNodeId.value = node.id;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((event) => {
      'worklet';
      dragX.value = event.translationX;
      dragY.value = event.translationY;

      // Tilt physics calculations based on translation
      tiltX.value = withSpring(event.translationX / 15, { damping: 10 });
      tiltY.value = withSpring(-event.translationY / 15, { damping: 10 });

      if (activeDragX) activeDragX.value = initialX + event.translationX;
      if (activeDragY) activeDragY.value = initialY + event.translationY;

      // Check group ejection: Pulling up (>120px) removes node from group
      if (onEjectCard && event.translationY < -120) {
        runOnJS(onEjectCard)(node.id);
      }
    })
    .onEnd(() => {
      'worklet';
      isDraggingLocal.value = false;
      if (draggedNodeId) draggedNodeId.value = null;
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
      tiltX.value = withSpring(0);
      tiltY.value = withSpring(0);
    });

  // Pinch edge to resize gesture
  const pinchResizeGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      startCardScale.value = cardScale.value;
    })
    .onUpdate((event) => {
      'worklet';
      cardScale.value = Math.max(0.6, Math.min(2.5, startCardScale.value * event.scale));
    });

  // Long press for Context Menu (Quick Menu)
  const longPressGesture = Gesture.LongPress()
    .onStart(() => {
      'worklet';
      runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
      if (onLongPressMenu) {
        runOnJS(onLongPressMenu)(node);
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      runOnJS(onPress)(node, 'text');
    });

  const composedGesture = Gesture.Exclusive(
    dragGesture, 
    Gesture.Simultaneous(pinchResizeGesture, Gesture.Exclusive(longPressGesture, tapGesture))
  );

  const cardStyle = useAnimatedStyle(() => {
    let offsetX = 0;
    let offsetY = 0;
    if (draggedNodeId && draggedNodeId.value && draggedNodeId.value !== node.id) {
      if (activeDragX && activeDragY) {
        const dx = initialX - activeDragX.value;
        const dy = initialY - activeDragY.value;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const PUSH_RADIUS = 160;
        const MAX_PUSH = 45;
        if (dist < PUSH_RADIUS && dist > 0) {
          const pushStrength = (1 - dist / PUSH_RADIUS) * MAX_PUSH;
          const angle = Math.atan2(dy, dx);
          offsetX = Math.cos(angle) * pushStrength;
          offsetY = Math.sin(angle) * pushStrength;
        }
      }
    }
    const currentX = initialX + dragX.value + offsetX;
    const currentY = initialY + dragY.value + offsetY;
    return {
      transform: [
        { translateX: currentX },
        { translateY: currentY },
        { rotate: `${rotationAngle}deg` },
        { rotateX: `${tiltY.value}deg` },
        { rotateY: `${tiltX.value}deg` },
        { scale: withSpring(isDraggingLocal.value ? 1.05 * cardScale.value : 1.0 * cardScale.value, { damping: 15 }) }
      ],
      zIndex: isDraggingLocal.value ? 999 : 10,
      shadowOpacity: withSpring(isDraggingLocal.value ? 0.18 : 0.08, { damping: 15 }),
      shadowRadius: withSpring(isDraggingLocal.value ? 28 : 18),
    };
  });

  const renderCardContent = () => {
    const isFused = node.fusedAudio || (node.source_type === 'image' && node.duration);

    switch (node.source_type) {
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
            <View style={styles.docPill}>
              <Text style={styles.docPillText}>PDF</Text>
            </View>
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
              <View style={styles.mapPin}>
                <Ionicons name="location" size={14} color="#E8673C" />
              </View>
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
            {/* Floating Glassmorphic Text overlay (Full edge-to-edge bleed) */}
            <View style={styles.photoGlassOverlay}>
              <BlurView experimentalBlurMethod="dimezisBlurView" intensity={30} style={StyleSheet.absoluteFillObject} tint="dark" />
              <View style={styles.photoHeader}>
                <Ionicons name="image-outline" size={12} color="#E8673C" style={{ marginRight: 6 }} />
                <Text style={styles.photoTitle} numberOfLines={1}>{node.content}</Text>
              </View>

              {/* Fused Voice Note Waveform overlay if conjugated */}
              {isFused && (
                <View style={styles.fusionWaveform}>
                  {[12, 22, 16, 26, 32, 14, 8, 18, 28, 22].map((h, idx) => (
                    <View key={idx} style={[styles.waveBar, { height: h * 0.4 }]} />
                  ))}
                  <Text style={styles.waveTime}>{node.duration || '1:30'}</Text>
                </View>
              )}
              <Text style={styles.photoTime}>{node.date || 'Today'}</Text>
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.textCard}>
            <Text style={styles.textCategory}>{node.category || 'Journal'}</Text>
            <Text style={styles.textContent}>{node.content}</Text>
            <Text style={styles.textDate}>{node.date || 'Today'}</Text>
          </View>
        );
    }
  };

  const isOrangeCard = node.id === 'card-2';
  const isDark = theme === 'dark';

  return (
    <Animated.View style={[styles.cardWrapper, cardStyle]}>
      <GestureDetector gesture={composedGesture}>
        <View style={[
          styles.cardInner, 
          { 
            borderRadius: cardBorderRadius,
            backgroundColor: isOrangeCard 
              ? '#E8673C' 
              : isDark 
                ? 'rgba(15, 15, 18, 0.42)' 
                : 'rgba(255, 255, 255, 0.58)'
          }
        ]}>
          {!isOrangeCard && isDark && (
            <BlurView 
              experimentalBlurMethod="dimezisBlurView" 
              intensity={45} 
              style={StyleSheet.absoluteFillObject} 
              tint="dark" 
            />
          )}
          
          {!isOrangeCard && (
            <LinearGradient
              colors={
                isDark 
                  ? ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0)']
                  : ['rgba(255, 255, 255, 0.65)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)']
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
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : isDark 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(0, 0, 0, 0.07)', 
                borderWidth: 1.0 
              }
            ]} 
          />
          {renderCardContent()}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

export default memo(DriftNode);

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  cardInner: {
    overflow: 'hidden',
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
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
  photoCard: {
    overflow: 'hidden',
  },
  fusionWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginVertical: 4,
  },
  waveBar: {
    width: 2,
    backgroundColor: '#E8673C',
    borderRadius: 1,
  },
  waveTime: {
    fontSize: 8,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  todoCard: {
    width: 160,
    padding: 14,
  },
  todoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  todoCheck: {
    width: 13,
    height: 13,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  todoCheckActive: {
    borderColor: '#E8673C',
    backgroundColor: '#E8673C',
  },
  todoItemText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  todoItemTextCompleted: {
    color: 'rgba(255, 255, 255, 0.35)',
    textDecorationLine: 'line-through',
  },
  docCard: {
    width: 160,
    padding: 14,
  },
  docPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(232, 103, 60, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 8,
  },
  docPillText: {
    fontSize: 8,
    color: '#E8673C',
    fontWeight: '700',
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  docMeta: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  mapCard: {
    width: 160,
  },
  mapPreview: {
    height: 95,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#1E1E24',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapPin: {
    backgroundColor: '#1A1A1E',
    padding: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapMeta: {
    padding: 10,
  },
  mapTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapTime: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  moodboardCard: {
    width: 180,
    padding: 12,
  },
  moodboardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  moodboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: 6,
  },
  moodboardThumb: {
    width: '48%',
    height: 44,
    borderRadius: 6,
  },
  moodboardMeta: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  linkCard: {
    width: 170,
    padding: 12,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 8,
    color: '#E8673C',
    flex: 1,
  },
  linkTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  linkTime: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  photoMeta: {
    padding: 10,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  photoTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  photoTime: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  textCard: {
    width: 150,
    padding: 12,
  },
  textCategory: {
    fontSize: 9,
    color: '#E8673C',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textContent: {
    fontSize: 11,
    lineHeight: 16,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  textDate: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
