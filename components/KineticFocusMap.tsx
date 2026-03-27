import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedRef,
  scrollTo,
  useAnimatedProps,
  withSpring,
  useDerivedValue,
  runOnJS,
  FadeIn,
  FadeOut,
  SharedValue
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';

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

function getTargetY(node: any, activeCluster: SharedValue<number>, activeNodeClusterIndex: SharedValue<number>, activeNodeOriginY: SharedValue<number>) {
  'worklet';
  if (activeCluster.value !== -1) {
    const offsetIndex = (node.clusterIndex ?? 0) - activeNodeClusterIndex.value;
    return activeNodeOriginY.value + offsetIndex * 240;
  }
  return node.unfocusedY;
}

function getTargetX(node: any, activeCluster: SharedValue<number>, activeNodeOriginX: SharedValue<number>) {
  'worklet';
  if (activeCluster.value !== -1) {
    const baseAxisX = activeNodeOriginX.value;
    const originalX = node.unfocusedX;
    const idx = node.clusterIndex ?? 0;
    // Premium Mathplot Wander: Increased amplitude (95) and complex frequencies
    const wander1 = Math.sin(idx * 0.45) * 95;
    const wander2 = Math.cos(idx * 1.7) * 35;
    const wander3 = Math.sin(idx * 2.3) * 20;
    const totalWander = wander1 + wander2 + wander3;
    return baseAxisX + (originalX - baseAxisX) * 0.08 + totalWander;
  }
  return node.unfocusedX;
}

function AnimatedOverlayPath({ node, targetNode, stateRefs, rootCategories }: any) {
  const { activeCluster, activeNodeClusterIndex, activeNodeOriginY, activeNodeOriginX } = stateRefs;
  const sY = useDerivedValue(() => withSpring(getTargetY(node, activeCluster, activeNodeClusterIndex, activeNodeOriginY), SPRING_CONFIG));
  const sX = useDerivedValue(() => withSpring(getTargetX(node, activeCluster, activeNodeOriginX), SPRING_CONFIG));
  const eY = useDerivedValue(() => withSpring(getTargetY(targetNode, activeCluster, activeNodeClusterIndex, activeNodeOriginY), SPRING_CONFIG));
  const eX = useDerivedValue(() => withSpring(getTargetX(targetNode, activeCluster, activeNodeOriginX), SPRING_CONFIG));

  const animatedProps = useAnimatedProps(() => {
    const focusColor = rootCategories && rootCategories.length > 0 ? (CATEGORY_COLORS[rootCategories[0]] || CATEGORY_COLORS.Synthesis) : CATEGORY_COLORS.Synthesis;
    const commonCategory = node.categories.find((c: string) => targetNode.categories.includes(c));
    const strokeColor = activeCluster.value !== -1 ? focusColor : (commonCategory ? (CATEGORY_COLORS[commonCategory] || '#111111') : CATEGORY_COLORS.Synthesis);
    const thickness = node.importance * 1.5 + 0.5;
    const idx = node.clusterIndex ?? 0;
    
    // BEAUTY CURVES: Deeper tangents (240) + organic horizontal variance
    const nudge = Math.sin(idx * 2.3) * 10;
    const cpWander1 = Math.cos(idx * 1.5) * 35;
    const cpWander2 = Math.sin(idx * 3.1) * 25;
    
    const cp1x = sX.value + nudge + cpWander1;
    const cp2x = eX.value + nudge + cpWander2;
    const tangent = 240;
    
    return {
      d: `M ${sX.value} ${sY.value} C ${cp1x} ${sY.value + tangent}, ${cp2x} ${eY.value - tangent}, ${eX.value} ${eY.value}`,
      stroke: strokeColor,
      strokeWidth: withTiming(thickness),
      opacity: withTiming(node.ageFade * 0.9),
    };
  });
  return <AnimatedPath fill="none" animatedProps={animatedProps} />;
}

function CategoryRing({ cat, idx, node, stateRefs }: any) {
  const { activeCluster } = stateRefs;
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, stateRefs.activeNodeOriginX));
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, stateRefs.activeNodeClusterIndex, stateRefs.activeNodeOriginY));
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
  const { activeCluster, activeNodeClusterIndex, activeNodeOriginY, activeNodeOriginX } = stateRefs;
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeClusterIndex, activeNodeOriginY));
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
  const { activeCluster, activeNodeClusterIndex, activeNodeOriginY, activeNodeOriginX } = stateRefs;
  const textWidth = width * 0.55;
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeClusterIndex, activeNodeOriginY));
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, activeNodeOriginX));
  const textLeft = useDerivedValue(() => {
    if (activeCluster.value !== -1) {
      const axisX = currentX.value;
      const leftSpace = axisX - 36;
      const rightSpace = width - axisX - 40;
      const canFitLeft = leftSpace >= textWidth;
      const canFitRight = rightSpace >= textWidth;
      
      // BALANCED RANDOMIZED LAYOUT: Alternate sides by default (idx % 2)
      let placeRight = (node.clusterIndex % 2 === 0);
      
      if (placeRight && !canFitRight && canFitLeft) placeRight = false;
      else if (!placeRight && !canFitLeft && canFitRight) placeRight = true;
      if (placeRight) return Math.min(axisX + 40, width - textWidth - 20);
      return Math.max(axisX - textWidth - 36, 20);
    }
    return node.unfocusedTextLeft;
  });
  const animatedStyle = useAnimatedStyle(() => ({
    top: withSpring(currentY.value - node.paddingBefore - 44, SPRING_CONFIG),
    paddingLeft: withSpring(textLeft.value, SPRING_CONFIG),
    opacity: node.ageFade,
  }));
  const tap = Gesture.Tap().onEnd(() => { 'worklet'; runOnJS(onExpandNode)(node); });
  const displayLines = useMemo(() => {
    let hash = 0;
    for (let j = 0; j < node.id.length; j++) hash = node.id.charCodeAt(j) + ((hash << 5) - hash);
    return 2 + (Math.abs(hash) % 4);
  }, [node.id]);

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', width: '100%', zIndex: 2 }, animatedStyle]}>
      <GestureDetector gesture={tap}>
        <Animated.View style={[{ width: textWidth, alignSelf: 'flex-start' }]}>
          <View style={[{ paddingTop: 30, paddingBottom: 30, justifyContent: 'center' }]}>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
              {node.categories.map((cat: string) => {
                const isMain = rootCategories.includes(cat);
                return (
                  <Text key={cat} style={[styles.noteCategory, { color: CATEGORY_COLORS[cat] || '#BBBBBB', opacity: Math.min(1, node.ageFade + (isMain ? 0.4 : 0.1)) }]}>{cat}</Text>
                );
              })}
            </View>
            <View style={{ height: 28 * displayLines, overflow: 'hidden' }}>
              <Text style={styles.noteContent}>{node.content}</Text>
              {node.content.length > 50 && (
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,1)']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
                />
              )}
            </View>
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
  const localTotalHeight = paddingBefore + clusterNotes.length * 240 + height * 0.5;
  const isRight = rootNode.isRight;
  const focusAxisX = isRight ? width - 60 : 60;
  const stateRefs = { activeCluster: useSharedValue(1), activeNodeClusterIndex: useSharedValue(0), activeNodeOriginY: useSharedValue(0), activeNodeOriginX: useSharedValue(focusAxisX) };

  useEffect(() => {
    const rootIdx = clusterNotes.findIndex((c: any) => c.id === rootNode.id);
    const safeIdx = rootIdx > -1 ? rootIdx : 0;
    scrollRef.current?.scrollTo({ y: safeIdx * 240, animated: false });
    requestAnimationFrame(() => { stateRefs.activeNodeOriginY.value = paddingBefore + safeIdx * 240; stateRefs.activeNodeOriginX.value = focusAxisX; stateRefs.activeCluster.value = 1; stateRefs.activeNodeClusterIndex.value = safeIdx; });
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
                      return <AnimatedOverlayPath key={`line-${node.id}`} node={{...node, clusterIndex: idx}} targetNode={{...gTarget, clusterIndex: fIdx}} stateRefs={stateRefs} rootCategories={rootNode.categories} />;
                    })}
                    {clusterNotes.map((node: any, idx: number) => (
                      <AnimatedNodeDot key={`dot-${node.id}`} node={{...node, clusterIndex: idx}} stateRefs={stateRefs} rootCategories={rootNode.categories} />
                    ))}
                  </Svg>
                </View>
                <View style={{ marginTop: paddingBefore }} pointerEvents="box-none">
                  {clusterNotes.map((node: any, idx: number) => (
                    <AnimatedNoteCard key={node.id} node={{...node, clusterIndex: idx, paddingBefore}} stateRefs={stateRefs} onExpandNode={setReadingNode} rootCategories={rootNode.categories} />
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
              <ScrollView showsVerticalScrollIndicator={false}><Text style={[styles.noteContent, { fontSize: 24, lineHeight: 36 }]}>{readingNode.content}</Text></ScrollView>
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
