import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  scrollTo,
  SharedValue,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SPRING_CONFIG = { damping: 24, stiffness: 120, overshootClamping: true };

const TICK_SOUND_URL = 'https://www.soundjay.com/buttons/button-20.mp3';

const CATEGORY_COLORS: Record<string, string> = {
  Idea: '#111111',
  Todo: '#C45C2A',
  Journal: '#4A6FA5',
  Study: '#5B8C5A',
  Synthesis: '#8E44AD'
};

function getTargetY(node: any, activeCluster: SharedValue<number>, activeNodeOriginY: SharedValue<number>, _clusterMinY: SharedValue<number>) {
  'worklet';
  if (activeCluster.value !== -1) {
    const FIXED_GAP = 180; // Maximum density for visibility
    return activeNodeOriginY.value + (node.clusterIndex ?? 0) * FIXED_GAP;
  }
  return node.unfocusedY;
}

function getTargetX(node: any, activeCluster: SharedValue<number>, activeNodeOriginX: SharedValue<number>) {
  'worklet';
  if (activeCluster.value !== -1) {
    const centerX = width / 2;
    // Compress map's horizontal sprawl to 35% for a tight serpentine visual
    const compressedX = centerX + (node.unfocusedX - centerX) * 0.35;
    return compressedX;
  }
  return node.unfocusedX;
}

function AnimatedOverlayPath({ node, targetNode, stateRefs, rootCategories }: any) {
  const { activeCluster, activeNodeOriginY, activeNodeOriginX, clusterMinY } = stateRefs;
  const sY = useDerivedValue(() => withSpring(getTargetY(node, activeCluster, activeNodeOriginY, clusterMinY), SPRING_CONFIG));
  const sX = useDerivedValue(() => withSpring(getTargetX(node, activeCluster, activeNodeOriginX), SPRING_CONFIG));
  const eY = useDerivedValue(() => withSpring(getTargetY(targetNode, activeCluster, activeNodeOriginY, clusterMinY), SPRING_CONFIG));
  const eX = useDerivedValue(() => withSpring(getTargetX(targetNode, activeCluster, activeNodeOriginX), SPRING_CONFIG));

  const animatedProps = useAnimatedProps(() => {
    const focusColor = rootCategories && rootCategories.length > 0 ? (CATEGORY_COLORS[rootCategories[0]] || CATEGORY_COLORS.Synthesis) : CATEGORY_COLORS.Synthesis;
    const commonCategory = node.categories.find((c: string) => targetNode.categories.includes(c));
    const strokeColor = activeCluster.value !== -1 ? focusColor : (commonCategory ? (CATEGORY_COLORS[commonCategory] || '#111111') : CATEGORY_COLORS.Synthesis);
    const thickness = node.importance * 1.5 + 0.5;

    // Elegant S-curves that mirror map style even at high density
    const dy = Math.abs(eY.value - sY.value);
    const tangent = Math.max(160, dy * 0.6);

    return {
      d: `M ${sX.value} ${sY.value} C ${sX.value} ${sY.value + tangent}, ${eX.value} ${eY.value - tangent}, ${eX.value} ${eY.value}`,
      stroke: strokeColor,
      strokeWidth: withTiming(thickness),
      opacity: withTiming(node.ageFade * 0.4),
    };
  });
  return <AnimatedPath fill="none" animatedProps={animatedProps} />;
}

function CategoryRing({ cat, idx, node, stateRefs }: any) {
  const { activeCluster, activeNodeOriginY, activeNodeOriginX, clusterMinY } = stateRefs;
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, activeNodeOriginX));
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeOriginY, clusterMinY));
  const animatedProps = useAnimatedProps(() => {
    const isHybrid = node.categories.length > 1;
    const isFocused = activeCluster.value !== -1;
    return {
      cx: withSpring(currentX.value, SPRING_CONFIG),
      cy: withSpring(currentY.value, SPRING_CONFIG),
      r: isFocused ? node.nodeRadius * (3.2 + idx * 1.8) : node.nodeRadius * (2.2 + idx * 1.5),
      stroke: CATEGORY_COLORS[cat] || '#111111',
      strokeWidth: isFocused ? '1.5' : '1',
      strokeOpacity: withTiming((isHybrid ? 0.3 : 0.05) * node.ageFade * (isFocused ? 3 : 1)),
      opacity: (node.isGlowing || node.nodeRadius > 5 || isHybrid) ? 1 : 0,
    };
  });
  return <AnimatedCircle fill="none" animatedProps={animatedProps} />;
}

function AnimatedNodeDot({ node, stateRefs, rootCategories }: any) {
  const { activeCluster, activeNodeOriginY, activeNodeOriginX, clusterMinY } = stateRefs;
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeOriginY, clusterMinY));
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, activeNodeOriginX));
  const animatedPropsCore = useAnimatedProps(() => {
    const focusColor = rootCategories && rootCategories.length > 0 ? (CATEGORY_COLORS[rootCategories[0]] || '#111111') : '#111111';
    return {
      cx: withSpring(currentX.value, SPRING_CONFIG), cy: withSpring(currentY.value, SPRING_CONFIG),
      r: node.nodeRadius * 1.2,
      fill: focusColor,
      opacity: withTiming(node.ageFade + 0.3),
    };
  });
  return (
    <React.Fragment>
      <AnimatedCircle animatedProps={animatedPropsCore} />
      {node.categories.map((cat: string, idx: number) => (
        <CategoryRing key={cat} cat={cat} idx={idx} node={node} stateRefs={stateRefs} rootCategories={rootCategories} />
      ))}
    </React.Fragment>
  );
}

function AnimatedNoteCard({ node, stateRefs, onExpandNode, rootCategories }: any) {
  const { activeCluster, activeNodeOriginY, activeNodeOriginX, clusterMinY } = stateRefs;
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeOriginY, clusterMinY));
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, activeNodeOriginX));
  
  // DYNAMIC SAFE WIDTH: Shrink width to fit available space without overlapping rings or leaving screen
  const cardLayout = useDerivedValue(() => {
    if (activeCluster.value === -1) return { left: node.unfocusedTextLeft, width: width * 0.55 };
    
    const axisX = currentX.value;
    const PADDING = 60; // Safe clearance for rings
    const margin = 20;
    
    const rightSpace = width - axisX - PADDING - margin;
    const leftSpace = axisX - PADDING - margin;
    
    let placeRight = node.isRight;
    if (placeRight && rightSpace < 120 && leftSpace > rightSpace) placeRight = false;
    else if (!placeRight && leftSpace < 120 && rightSpace > leftSpace) placeRight = true;
    
    const available = placeRight ? rightSpace : leftSpace;
    const finalWidth = Math.max(140, Math.min(width * 0.52, available));
    const left = placeRight ? axisX + PADDING : axisX - PADDING - finalWidth;
    
    return { left, width: finalWidth };
  });

  const animatedStyle = useAnimatedStyle(() => ({
    top: withSpring(currentY.value - node.paddingBefore - 44, SPRING_CONFIG),
    left: withSpring(cardLayout.value.left, SPRING_CONFIG),
    width: withSpring(cardLayout.value.width, SPRING_CONFIG),
    opacity: node.ageFade,
  }));
  const tap = Gesture.Tap().onEnd(() => { 'worklet'; runOnJS(onExpandNode)(node); });
  const displayLines = useMemo(() => {
    let hash = 0;
    for (let j = 0; j < node.id.length; j++) hash = node.id.charCodeAt(j) + ((hash << 5) - hash);
    // Standard growth (2-5 lines)
    return 2 + (Math.abs(hash) % 4);
  }, [node.id]);

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', zIndex: 2 }, animatedStyle]}>
      <GestureDetector gesture={tap}>
        <Animated.View>
          <View style={[{ paddingTop: 20, paddingBottom: 20, justifyContent: 'center' }]}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              {node.categories.map((cat: string) => {
                const isMain = rootCategories.includes(cat);
                return (
                  <Text key={cat} style={[styles.noteCategory, { color: CATEGORY_COLORS[cat] || '#BBBBBB', opacity: Math.min(1, node.ageFade + (isMain ? 0.4 : 0.1)) }]}>{cat}</Text>
                );
              })}
            </View>
            <View style={{ height: 28 * displayLines, overflow: 'hidden' }}>
              <Text numberOfLines={displayLines} style={styles.noteContent}>{node.content}</Text>
              {node.content.length > 50 && (
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,1)']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
                />
              )}
            </View>
            {node.images && node.images.length > 0 && (
              <Image source={{ uri: node.images[0] }} style={{ width: '100%', height: 120, borderRadius: 12, marginTop: 12 }} transition={200} contentFit="cover" />
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function KineticFocusMap({ rootNode, mappedNotes, onClose }: any) {
  const scrollY = useSharedValue(0);
  const startScrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const [readingNode, setReadingNode] = useState<any>(null);
  const lastTickY = useSharedValue(0);
  const player = useAudioPlayer(TICK_SOUND_URL);

  const handleTick = () => {
    Haptics.selectionAsync();
    if (player) player.play();
  };

  const triggerTick = () => {
    'worklet';
    runOnJS(handleTick)();
  };

  const backTap = Gesture.Tap().onEnd(() => { 'worklet'; runOnJS(onClose)(); });
  const closeReadingNodeTap = Gesture.Tap().onEnd(() => { 'worklet'; runOnJS(setReadingNode)(null); });

  const scrubberPan = Gesture.Pan().activateAfterLongPress(250)
    .onStart(() => {
      'worklet';
      startScrollY.value = scrollY.value;
      lastTickY.value = scrollY.value;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((event) => {
      'worklet';
      const newY = Math.max(0, startScrollY.value + event.translationY * 3.5);
      scrollTo(scrollRef, 0, newY, false);
      if (Math.abs(newY - lastTickY.value) >= 60) {
        lastTickY.value = newY;
        triggerTick();
      }
    });

  const clusterNotes = mappedNotes.filter((n: any) => {
    const rootCats = rootNode.categories;
    const nodeCats = n.categories;
    return rootCats.length === 1 ? nodeCats.includes(rootCats[0]) : rootCats.every((c: string) => nodeCats.includes(c));
  });

  const paddingBefore = height * 0.35;
  const FIXED_GAP = 180;
  const localTotalHeight = paddingBefore + clusterNotes.length * FIXED_GAP + height * 0.5;

  const isRight = rootNode.isRight;
  const focusAxisX = isRight ? width - 60 : 60;

  const stateRefs = {
    activeCluster: useSharedValue(1),
    activeNodeOriginY: useSharedValue(paddingBefore),
    activeNodeOriginX: useSharedValue(focusAxisX),
    clusterMinY: useSharedValue(0)
  };

  useEffect(() => {
    const FIXED_GAP = 180;
    const rootIdx = clusterNotes.findIndex((c: any) => c.id === rootNode.id);
    const safeIdx = rootIdx > -1 ? rootIdx : 0;

    // Scroll so the root node is roughly at paddingBefore position
    scrollRef.current?.scrollTo({ y: safeIdx * FIXED_GAP, animated: false });

    requestAnimationFrame(() => {
      stateRefs.activeNodeOriginY.value = paddingBefore;
      stateRefs.activeNodeOriginX.value = focusAxisX;
      stateRefs.activeCluster.value = 1;
      stateRefs.clusterMinY.value = 0;
    });
  }, [rootNode.id]);

  const scrollHandler = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  const focusIdToIndex: Record<string, number> = {};
  clusterNotes.forEach((n: any, i: number) => { focusIdToIndex[n.id] = i; });

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: '#FFFFFF' }]}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={Gesture.Exclusive(scrubberPan, backTap)}>
          <View style={{ flex: 1 }}>
            <Animated.ScrollView ref={scrollRef} onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ height: localTotalHeight, width: '100%' }} showsVerticalScrollIndicator={false} pointerEvents="box-none" style={{ zIndex: 2 }}>
              <View style={{ flex: 1 }} pointerEvents="box-none">
                <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
                  <Svg width="100%" height={localTotalHeight}>
                    {clusterNotes.map((node: any, idx: number) => {
                      const gTarget = node.connectedNodeIndex !== null ? mappedNotes[node.connectedNodeIndex] : null;
                      const fIdx = gTarget ? focusIdToIndex[gTarget.id] : undefined;
                      if (!gTarget || fIdx === undefined) return null;
                      return <AnimatedOverlayPath key={`line-${node.id}`} node={{ ...node, clusterIndex: idx }} targetNode={{ ...gTarget, clusterIndex: fIdx }} stateRefs={stateRefs} rootCategories={rootNode.categories} />;
                    })}
                    {clusterNotes.map((node: any, idx: number) => (
                      <AnimatedNodeDot key={`dot-${node.id}`} node={{ ...node, clusterIndex: idx }} stateRefs={stateRefs} rootCategories={rootNode.categories} />
                    ))}
                  </Svg>
                </View>
                <View style={{ marginTop: paddingBefore }} pointerEvents="box-none">
                  {clusterNotes.map((node: any, idx: number) => (
                    <AnimatedNoteCard key={node.id} node={{ ...node, clusterIndex: idx, paddingBefore }} stateRefs={stateRefs} onExpandNode={setReadingNode} rootCategories={rootNode.categories} />
                  ))}
                </View>
              </View>
            </Animated.ScrollView>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: focusAxisX - 80, width: 160, zIndex: 3 }} />
          </View>
        </GestureDetector>
        {readingNode && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.92)', zIndex: 200, justifyContent: 'center', alignItems: 'center' }]}>
            <GestureDetector gesture={closeReadingNodeTap}><Animated.View style={StyleSheet.absoluteFill} /></GestureDetector>
            <View pointerEvents="box-none" style={{ width: '85%', maxHeight: '70%', padding: 36, backgroundColor: '#FFFFFF', borderRadius: 16, shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 30, elevation: 10 }}>
              <Text style={[styles.noteCategory, { color: CATEGORY_COLORS[readingNode.categories[0]] || '#BBBBBB', marginBottom: 12 }]}>{readingNode.categories.join(' + ')} — SYNTHESIS</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {readingNode.images && readingNode.images.length > 0 && (
                  <Image source={{ uri: readingNode.images[0] }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }} transition={200} contentFit="cover" />
                )}
                <Text style={[styles.noteContent, { fontSize: 24, lineHeight: 36 }]}>{readingNode.content}</Text>
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </GestureHandlerRootView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 18, fontWeight: '300', lineHeight: 28, color: '#111111' },
});
