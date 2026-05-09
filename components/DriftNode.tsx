import React, { useEffect, memo } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring, runOnJS, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DriftNodeProps {
  node: any;
  onPress: (node: any, type: 'dot' | 'text') => void;
  onDragStart?: (node: any, startX: number, startY: number) => void;
  onDragUpdateSharedX?: SharedValue<number>;
  onDragUpdateSharedY?: SharedValue<number>;
  onDragUpdateSharedCategory?: SharedValue<string | undefined>;
  onDragEnd?: (x: number, y: number, category: string | undefined) => void;
  scrollY?: SharedValue<number>;
  activeView?: 'chronos' | 'nexus';
  searchStatus?: 'match' | 'dim' | 'none';
  isFirst?: boolean;
  isInHull?: boolean;
}

const CATEGORIES = Object.keys(CATEGORY_COLORS);
const RING_SPACING = 16;
const START_RADIUS = 30;
const MAX_RADIUS = START_RADIUS + (CATEGORIES.length - 1) * RING_SPACING;
const PADDING = 20;
const PORTAL_CENTER_X = SCREEN_WIDTH / 2;
const PORTAL_CENTER_Y = SCREEN_HEIGHT / 2.3;

function DriftNode({ node, onPress, onDragStart, onDragUpdateSharedX, onDragUpdateSharedY, onDragUpdateSharedCategory, onDragEnd, scrollY, activeView, searchStatus = 'none', isFirst, isInHull }: DriftNodeProps) {
  const theme = useNotesStore(state => state.theme);
  const localYBase = node.unfocusedY - 60;
  const isRefining = node.is_refining;
  const resonancesObj = node.resonances || { [node.category]: 1.0 };
  const sortedResonances = Object.entries(resonancesObj).sort((a: any, b: any) => (b[1] as number) - (a[1] as number));
  const primaryCat = sortedResonances[0]?.[0] || node.category;
  const secondaryCat = sortedResonances.length > 1 && (sortedResonances[1][1] as number) > 0.2 ? sortedResonances[1][0] : primaryCat;
  
  const isPinned = useNotesStore(state => state.studioSeeds?.includes(node.id));
  const isSynthesis = node.source_type === 'synthesis';
  
  const mainColor = isSynthesis ? '#9B59B6' : (isRefining ? '#4A90E2' : (CATEGORY_COLORS[primaryCat] || '#8E44AD'));
  const color1 = mainColor;
  const color2 = isSynthesis ? '#F1C40F' : (isRefining ? '#9013FE' : (CATEGORY_COLORS[secondaryCat] || color1));
  const isDual = isSynthesis || (sortedResonances.length > 1 && primaryCat !== secondaryCat);

  
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const outerPulseScale = useSharedValue(1);
  const outerPulseOpacity = useSharedValue(0.1);
  
  const searchPulseScale = useSharedValue(1);
  const searchPulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (searchStatus === 'match') {
      searchPulseScale.value = withRepeat(
        withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      searchPulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1, false
      );
    } else {
      searchPulseScale.value = withTiming(1);
      searchPulseOpacity.value = withTiming(0);
    }
  }, [searchStatus]);

  useEffect(() => {
    if (node.is_ghost || isFirst || isRefining || isSynthesis) {
      const duration = isSynthesis ? 2000 : 1200;
      const scale = isSynthesis ? 2.2 : 1.6;
      
      pulseScale.value = withRepeat(
        withTiming(scale, { duration, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      pulseOpacity.value = withRepeat(
        withTiming(isSynthesis ? 0.2 : 0.4, { duration, easing: Easing.inOut(Easing.ease) }),
        -1, true
      );
      
      if (!isRefining) {
        outerPulseScale.value = withRepeat(
          withTiming(isSynthesis ? 4.5 : 3.0, { duration: isSynthesis ? 3000 : 2000, easing: Easing.out(Easing.ease) }),
          -1, false
        );
        outerPulseOpacity.value = withRepeat(
          withTiming(0, { duration: isSynthesis ? 3000 : 2000, easing: Easing.out(Easing.ease) }),
          -1, false
        );
      }
 else {
        outerPulseScale.value = 1;
        outerPulseOpacity.value = 0;
      }
    } else {
      pulseScale.value = withTiming(1.1); pulseOpacity.value = 0.15;
      outerPulseScale.value = 1; outerPulseOpacity.value = 0.05;
    }
  }, [node.is_ghost, isFirst, isRefining]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const searchPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchPulseScale.value }],
    opacity: searchPulseOpacity.value,
  }));

  const outerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerPulseScale.value }],
    opacity: outerPulseOpacity.value,
  }));

  const importanceScore = Math.min(1, Math.max(0, (node.content.length - 15) / 150));
  
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const startViewportX = useSharedValue(0);
  const startViewportY = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => {
    let targetOpacity = 0.9;
    if (searchStatus === 'dim') targetOpacity = 0.05;
    else if (searchStatus === 'match') targetOpacity = 1.0;

    const currentBaseX = node.unfocusedX;
    const currentBaseY = node.unfocusedY;
    const dragOpacity = isDragging.value ? withTiming(0.12, { duration: 200 }) : withTiming(targetOpacity, { duration: 300 });

    return {
      top: isDragging.value ? localYBase + dragY.value : withSpring(currentBaseY - 60 + dragY.value, { damping: 25, stiffness: 60 }),
      left: withSpring(currentBaseX + dragX.value, { damping: 28, stiffness: 80 }),
      zIndex: isDragging.value ? 5000 : (searchStatus === 'match' ? 100 : 2),
      transform: [{ scale: withSpring(isDragging.value ? 1.25 : 1.0) }],
      opacity: dragOpacity,
    };
  }, [importanceScore, searchStatus, localYBase, mainColor, node.unfocusedX, node.unfocusedY, isInHull]);

  const innerContentStyle = useAnimatedStyle(() => {
    let targetScale = 0.85;
    if (searchStatus === 'dim') targetScale = targetScale * 0.8;
    else if (searchStatus === 'match') targetScale = targetScale * 1.15;

    let targetOpacity = 1.0;
    if (searchStatus === 'dim') targetOpacity = 0.4;
    else if (searchStatus === 'match') targetOpacity = 1.0;

    return {
      transform: [
        { scale: withSpring(targetScale, { damping: 20, stiffness: 90 }) },
        { rotateX: '0deg' },
        { perspective: 1000 }
      ],
      opacity: withTiming(targetOpacity, { duration: 400 })
    };
  }, [importanceScore, searchStatus, mainColor, isInHull]);

  const longPressGesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart((event) => {
        'worklet';
        isDragging.value = true;
        startViewportX.value = node.unfocusedX;
        startViewportY.value = localYBase + 60 - (scrollY?.value || 0);
        
        if (onDragStart) runOnJS(onDragStart)(node, startViewportX.value, startViewportY.value);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((event) => {
      'worklet';
      dragX.value = event.translationX;
      dragY.value = event.translationY;
      
      const absX = node.unfocusedX + event.translationX;
      const absY = localYBase + 60 + event.translationY;
      const viewportY = absY - (scrollY?.value || 0);
      
      if (onDragUpdateSharedX) onDragUpdateSharedX.value = absX;
      if (onDragUpdateSharedY) onDragUpdateSharedY.value = viewportY; // Viewport-relative for Overlay

      if (onDragUpdateSharedCategory) {
          // ADAPTIVE HALO MATH: The Halo center is sticky to the screen boundaries
          const haloCenterX = Math.min(Math.max(startViewportX.value, MAX_RADIUS + PADDING), SCREEN_WIDTH - MAX_RADIUS - PADDING);
          const haloCenterY = Math.min(Math.max(startViewportY.value, MAX_RADIUS + PADDING), SCREEN_HEIGHT - MAX_RADIUS - PADDING);

          const dx = absX - haloCenterX;
          const dy = viewportY - haloCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let newCat: string | undefined = undefined;
          if (dist > START_RADIUS - 10) {
              const idx = Math.floor((dist - START_RADIUS + RING_SPACING/2) / RING_SPACING);
              if (idx >= 0 && idx < CATEGORIES.length) {
                  newCat = CATEGORIES[idx];
              }
          }
          if (onDragUpdateSharedCategory.value !== newCat) {
              onDragUpdateSharedCategory.value = newCat;
          }
      }
    })
    .onEnd((event) => {
      'worklet';
      // CRITICAL: Capture category HERE on the UI thread before clearing it.
      // If we clear first, the JS thread reads undefined.
      const committedCategory = onDragUpdateSharedCategory?.value;
      if (onDragEnd) runOnJS(onDragEnd)(
        node.unfocusedX + event.translationX, 
        localYBase + 60 + event.translationY,
        committedCategory
      );
      isDragging.value = false;
      dragX.value = withSpring(0);
      dragY.value = withSpring(0);
      if (onDragUpdateSharedCategory) onDragUpdateSharedCategory.value = undefined;
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      'worklet';
      runOnJS(onPress)(node, 'dot');
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  return (
    <Animated.View style={[{ position: 'absolute', width: '100%', height: 120 }, containerStyle]}>
      <Animated.View style={[{ 
        position: 'absolute', 
        top: 60 - node.nodeRadius * 4, 
        left: -node.nodeRadius * 4, 
        width: node.nodeRadius * 8, 
        height: node.nodeRadius * 8, 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 20 
      }, innerContentStyle]}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ position: 'absolute', width: node.nodeRadius * 6, height: node.nodeRadius * 6, borderRadius: node.nodeRadius * 3, backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }} />
            <Animated.View style={[{ position: 'absolute', width: node.nodeRadius * 3.8, height: node.nodeRadius * 3.8, borderRadius: node.nodeRadius * 1.9, borderWidth: 1.2, borderColor: color1, backgroundColor: 'transparent' }, pulseStyle]} />
            <View style={{ position: 'absolute', width: node.nodeRadius * 3.2, height: node.nodeRadius * 3.2, borderRadius: node.nodeRadius * 1.6, borderWidth: 0.8, borderColor: color1, opacity: 0.2 }} />
            <Animated.View style={[{ position: 'absolute', width: node.nodeRadius * 5, height: node.nodeRadius * 5, borderRadius: node.nodeRadius * 2.5, backgroundColor: isRefining ? 'transparent' : color1, opacity: searchStatus === 'match' ? 0 : (isRefining ? 1 : 0.05), borderWidth: 0.8, borderColor: color1, borderStyle: isRefining ? 'dashed' : 'solid' }, searchPulseStyle]} />
            {isDual && !isRefining && (
               <Animated.View style={[{ position: 'absolute', width: node.nodeRadius * 3.5, height: node.nodeRadius * 3.5, borderRadius: node.nodeRadius * 1.75, backgroundColor: color2, opacity: 0.4 }, outerPulseStyle]} />
            )}
            <View style={[{ position: 'absolute', width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, backgroundColor: color1, opacity: node.is_refining ? 0.5 : 1.0 }]} />
          </Animated.View>
        </GestureDetector>
      </Animated.View>
        
      <Animated.View 
        style={[{ 
          zIndex: 10, 
          position: 'absolute', 
          top: 30, 
          left: (node.isRight ? -node.dynamicWidth - PADDING : PADDING), 
          width: node.dynamicWidth, 
          height: 60, 
          justifyContent: 'center' 
        }, innerContentStyle]}
      >
        <Pressable 
          onPress={() => {
            try { Haptics.selectionAsync(); } catch (e) {}
            onPress(node, 'text');
          }}
          onLongPress={() => {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
            useNotesStore.getState().toggleStudioSeed(node.id);
          }}
          delayLongPress={400}
          style={({ pressed }) => ({ 
            width: '100%', 
            height: '100%', 
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1.0
          })}
        >
          <Text style={[styles.noteCategory, { color: mainColor, marginBottom: 6, opacity: Math.min(1, node.ageFade + 0.4) }]}>
            {isSynthesis ? '✧ SYNTHESIS ✧' : (node.is_refining ? 'REFINING...' : node.category?.toUpperCase())}
            {isPinned && ' ✦ IN STUDIO'}
          </Text>

          <View style={{ maxHeight: 60, overflow: 'hidden' }}>
            <Text numberOfLines={3} style={[styles.noteContent, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }, node.is_refining && { color: theme === 'dark' ? NightTheme.textMuted : '#BBBBBB' }]}>{node.content}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default memo(DriftNode, (prev, next) => {
  return (
    prev.node.id === next.node.id &&
    prev.node.unfocusedY === next.node.unfocusedY &&
    prev.node.unfocusedX === next.node.unfocusedX &&
    prev.isInHull === next.isInHull &&
    prev.searchStatus === next.searchStatus &&
    prev.isFirst === next.isFirst
  );
});

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 17, fontWeight: '300', lineHeight: 26, color: '#111111' },
});
