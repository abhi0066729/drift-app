import React, { useEffect, memo, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions, Image, Platform, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring, runOnJS, type SharedValue } from 'react-native-reanimated';
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
  isFirst 
}: DriftNodeProps) {
  const isDraggingLocal = useSharedValue(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  
  // Position setup
  const initialX = node.unfocusedX || 0;
  const initialY = node.unfocusedY || 0;
  
  // Custom organic rotations and shapes per card to create scattered aesthetic
  const rotationAngle = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++) {
      hash = node.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (hash % 40) / 10 - 2.0; // returns value between -2.0deg and +2.0deg
  }, [node.id]);

  const cardBorderRadius = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < node.id.length; i++) {
      hash = node.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 16 + (Math.abs(hash) % 3) * 4; // returns 16, 20, or 24
  }, [node.id]);

  // Gestures definition
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
      if (activeDragX) activeDragX.value = initialX + event.translationX;
      if (activeDragY) activeDragY.value = initialY + event.translationY;
    })
    .onEnd(() => {
      'worklet';
      isDraggingLocal.value = false;
      if (draggedNodeId) draggedNodeId.value = null;
      // Spring back or persist position relative to origin
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      runOnJS(onPress)(node, 'text');
    });

  const composedGesture = Gesture.Exclusive(dragGesture, tapGesture);

  const cardStyle = useAnimatedStyle(() => {
    let offsetX = 0;
    let offsetY = 0;
    // Avoidance physics math: push away if another node is being dragged close to us
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
        { scale: withSpring(isDraggingLocal.value ? 1.05 : 1.0, { damping: 15, stiffness: 150 }) }
      ],
      zIndex: isDraggingLocal.value ? 999 : 10,
      shadowOpacity: withSpring(isDraggingLocal.value ? 0.18 : 0.08, { damping: 15 }),
      shadowRadius: withSpring(isDraggingLocal.value ? 28 : 18),
      shadowOffset: {
        width: 0,
        height: isDraggingLocal.value ? 16 : 8,
      }
    };
  });

  // Render different visual templates based on node source type
  const renderCardContent = () => {
    switch (node.id) {
      // 1. Tall Portrait Image Card ("Samurai" / "Messages" style inspiration)
      case 'card-1':
        return (
          <View style={styles.samuraiCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=500&q=80' }} // Premium Tokyo/Samurai silhouette vibe
              style={[styles.samuraiImage, { borderRadius: cardBorderRadius }]} 
              resizeMode="cover" 
            />
            {/* Dark glass overlay at the bottom */}
            <View style={styles.samuraiOverlay}>
              <BlurView experimentalBlurMethod="dimezisBlurView" intensity={15} style={StyleSheet.absoluteFillObject} tint="dark" />
              <View style={styles.samuraiHeader}>
                <Text style={styles.samuraiTitle}>Tokyo Drift</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#E8673C" />
              </View>
              <Text style={styles.samuraiMeta}>Tensei 天聖 · 82%</Text>
            </View>
          </View>
        );
      // 2. Vibrant Orange Card ("Efficiency" Style in Reference Image)
      case 'card-2':
        return (
          <View style={styles.efficiencyCard}>
            <View style={styles.efficiencyHeader}>
              <Text style={styles.efficiencyTitle}>Efficiency</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.efficiencyWaveform}>
              {[12, 18, 26, 32, 28, 20, 14, 22, 38, 44, 30, 16, 12, 24, 34, 28, 18, 10].map((h, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.efficiencyWaveBar, 
                    { height: h * 0.8, backgroundColor: i < 8 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)' }
                  ]} 
                />
              ))}
            </View>
            <View style={styles.efficiencyFooter}>
              <View style={styles.efficiencyAvatar}>
                <Ionicons name="person" size={10} color="#E8673C" />
              </View>
              <View>
                <Text style={styles.efficiencyUser}>Tensei 天聖</Text>
                <Text style={styles.efficiencyProgress}>90% complete</Text>
              </View>
            </View>
          </View>
        );
      // 3. Deep Glassmorphic Card ("Knowledge" Style in Reference Image)
      case 'card-3':
        return (
          <View style={styles.knowledgeCard}>
            <View style={styles.knowledgeHeader}>
              <Text style={styles.knowledgeTitle}>Knowledge</Text>
              <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
            </View>
            <Text style={styles.knowledgeGlyph}>侍</Text>
            <View style={styles.knowledgeFooter}>
              <View style={styles.knowledgeAvatar}>
                <Ionicons name="person" size={10} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.knowledgeUser}>Tensei 天聖</Text>
                <Text style={styles.knowledgeProgress}>76% match</Text>
              </View>
            </View>
          </View>
        );
      default:
        // Render general cards in sleek premium dark glass style
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
              <View style={[styles.photoCard, { height: 180 }]}>
                <Image 
                  source={{ uri: node.content_image }} 
                  style={[StyleSheet.absoluteFillObject, { borderRadius: cardBorderRadius }]} 
                  resizeMode="cover" 
                />
                {/* Floating Glassmorphic Text overlay */}
                <View style={styles.photoGlassOverlay}>
                  <BlurView experimentalBlurMethod="dimezisBlurView" intensity={30} style={StyleSheet.absoluteFillObject} tint="dark" />
                  <View style={styles.photoHeader}>
                    <Ionicons name="image-outline" size={12} color="#E8673C" style={{ marginRight: 6 }} />
                    <Text style={styles.photoTitle} numberOfLines={2}>{node.content}</Text>
                  </View>
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
          {/* Glass background overlay (skipped for solid orange or light mode to avoid BlurView tint crashes) */}
          {!isOrangeCard && isDark && (
            <BlurView 
              experimentalBlurMethod="dimezisBlurView" 
              intensity={45} 
              style={StyleSheet.absoluteFillObject} 
              tint="dark" 
            />
          )}
          
          {/* Diagonal Glass Reflection Shine Overlay */}
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

          {/* Border Overlay */}
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

  photoGlassOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },

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
    backgroundColor: 'rgba(15, 15, 18, 0.42)',
  },
  cardBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // 1. Samurai Tall Image Card
  samuraiCard: {
    width: 200,
    height: 250,
  },
  samuraiImage: {
    width: '100%',
    height: '100%',
  },
  samuraiOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  samuraiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  samuraiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  samuraiMeta: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  // 2. Vibrant Orange "Efficiency" Card
  efficiencyCard: {
    width: 160,
    padding: 14,
  },
  efficiencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  efficiencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  efficiencyWaveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 38,
    gap: 2,
    marginVertical: 10,
  },
  efficiencyWaveBar: {
    width: 2.2,
    borderRadius: 1,
  },
  efficiencyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  efficiencyAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  efficiencyUser: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  efficiencyProgress: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  // 3. Glassmorphic "Knowledge" Card
  knowledgeCard: {
    width: 150,
    padding: 14,
  },
  knowledgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  knowledgeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  knowledgeGlyph: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    alignSelf: 'center',
    marginVertical: 8,
  },
  knowledgeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  knowledgeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  knowledgeUser: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  knowledgeProgress: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  // Generic Card Styles in Dark Theme
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
  photoCard: {
    overflow: 'hidden',
    width: 180,
  },
  photoImage: {
    width: '100%',
    height: 100,
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