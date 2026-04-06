

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useNotesStore } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { CATEGORY_COLORS as GLOBAL_COLORS } from '@/constants/Categories';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  runOnUI,
  scrollTo,
  SharedValue,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SPRING_CONFIG = { damping: 24, stiffness: 120, overshootClamping: true };



const CATEGORY_COLORS: Record<string, string> = {
  ...GLOBAL_COLORS,
  Idea: '#F4F1EA', 
  Synthesis: '#9B59B6'
};

function ScrubHint({ axisX }: { axisX: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const fingerScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    fingerScale.value = withSequence(
      withTiming(1, { duration: 1000 }),
      withTiming(0.7, { duration: 250 }),
      withTiming(0.7, { duration: 2400 }),
      withTiming(1, { duration: 400 })
    );

    translateY.value = withSequence(
      withTiming(0, { duration: 1250 }),
      withTiming(-120, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      withTiming(120, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) })
    );

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 1000 });
    }, 5500);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: fingerScale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: axisX - 30, top: height / 2 - 30, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(142, 68, 173, 0.1)', borderWidth: 1, borderColor: 'rgba(142, 68, 173, 0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }, animatedStyle]}>
      <View style={{ position: 'absolute', top: -30, width: 20, height: 20, alignItems: 'center' }}>
        <Svg width="14" height="10" viewBox="0 0 14 10">
          <Path d="M 1 9 L 7 1 L 13 9" stroke="#8E44AD" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{ position: 'absolute', bottom: -30, width: 20, height: 20, alignItems: 'center' }}>
        <Svg width="14" height="10" viewBox="0 0 14 10">
          <Path d="M 1 1 L 7 9 L 13 1" stroke="#8E44AD" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#8E44AD' }} />
    </Animated.View>
  );
}

function getTargetY(node: any, activeCluster: SharedValue<number>, activeNodeOriginY: SharedValue<number>) {
  'worklet';
  if (activeCluster.value !== -1) {
    const FIXED_GAP = 180;
    return activeNodeOriginY.value + (node.clusterIndex ?? 0) * FIXED_GAP;
  }
  return node.unfocusedY;
}

function getTargetX(node: any, activeCluster: SharedValue<number>, activeNodeOriginX: SharedValue<number>) {
  'worklet';
  if (activeCluster.value !== -1) {
    const centerX = width / 2;
    const compressedX = centerX + (node.unfocusedX - centerX) * 0.35;
    return compressedX;
  }
  return node.unfocusedX;
}

function AnimatedOverlayPath({ node, targetNode, activeCluster, activeNodeOriginY, activeNodeOriginX, rootCategories }: any) {
  const sY = useDerivedValue(() => withSpring(getTargetY(node, activeCluster, activeNodeOriginY), SPRING_CONFIG));
  const sX = useDerivedValue(() => withSpring(getTargetX(node, activeCluster, activeNodeOriginX), SPRING_CONFIG));
  const eY = useDerivedValue(() => withSpring(getTargetY(targetNode, activeCluster, activeNodeOriginY), SPRING_CONFIG));
  const eX = useDerivedValue(() => withSpring(getTargetX(targetNode, activeCluster, activeNodeOriginX), SPRING_CONFIG));

  const animatedProps = useAnimatedProps(() => {
    const focusColor = rootCategories && rootCategories.length > 0 ? (CATEGORY_COLORS[rootCategories[0]] || CATEGORY_COLORS.Synthesis) : CATEGORY_COLORS.Synthesis;
    const commonCategory = node.categories.find((c: string) => targetNode.categories.includes(c));
    const strokeColor = activeCluster.value !== -1 ? focusColor : (commonCategory ? (CATEGORY_COLORS[commonCategory] || '#111111') : CATEGORY_COLORS.Synthesis);
    const thickness = node.importance * 1.5 + 0.5;
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

function CategoryRing({ cat, idx, node, activeCluster, activeNodeOriginY, activeNodeOriginX }: any) {
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, activeNodeOriginX));
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeOriginY));
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

function AnimatedNodeDot({ node, activeCluster, activeNodeOriginY, activeNodeOriginX, rootCategories, isDark }: any) {
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeOriginY));
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, activeNodeOriginX));
  const animatedPropsCore = useAnimatedProps(() => {
    const defaultColor = isDark ? '#E8E6E0' : '#111111';
    const focusColor = rootCategories && rootCategories.length > 0 ? (CATEGORY_COLORS[rootCategories[0]] || defaultColor) : defaultColor;
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
        <CategoryRing key={cat} cat={cat} idx={idx} node={node} activeCluster={activeCluster} activeNodeOriginY={activeNodeOriginY} activeNodeOriginX={activeNodeOriginX} />
      ))}
    </React.Fragment>
  );
}

function AnimatedNoteCard({ node, activeCluster, activeNodeOriginY, activeNodeOriginX, onExpandNode, rootCategories, isDark }: any) {
  const currentY = useDerivedValue(() => getTargetY(node, activeCluster, activeNodeOriginY));
  const currentX = useDerivedValue(() => getTargetX(node, activeCluster, activeNodeOriginX));
  
  const cardLayout = useDerivedValue(() => {
    if (activeCluster.value === -1) return { left: node.unfocusedTextLeft, width: width * 0.55 };
    const axisX = currentX.value;
    const PADDING = 60;
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
              <Text numberOfLines={displayLines} style={[styles.noteContent, { color: isDark ? NightTheme.textPrimary : '#111111' }]}>{node.content}</Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function KineticFocusMap({ rootNode, mappedNotes, onClose }: any) {
  const theme = useNotesStore(state => state.theme);
  const isDark = theme === 'dark';
  const scrollY = useSharedValue(0);
  const startScrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const lastTickY = useSharedValue(0);

  const [readingNode, setReadingNode] = useState<any>(null);

  if (!rootNode) return null;

  const handleTick = () => {};

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
    if (!rootNode.categories) return false;
    const rootCats = rootNode.categories;
    const nodeCats = n.categories;
    return rootCats.length === 1 ? nodeCats.includes(rootCats[0]) : rootCats.every((c: string) => nodeCats.includes(c));
  });

  const paddingBefore = height * 0.35;
  const FIXED_GAP = 180;
  const localTotalHeight = paddingBefore + clusterNotes.length * FIXED_GAP + height * 0.5;
  const focusAxisX = rootNode.isRight ? width - 60 : 60;

  const activeCluster = useSharedValue(1);
  const activeNodeOriginY = useSharedValue(paddingBefore);
  const activeNodeOriginX = useSharedValue(focusAxisX);
  const clusterMinY = useSharedValue(0);

  useEffect(() => {
    const rootIdx = clusterNotes.findIndex((c: any) => c.id === rootNode.id);
    const safeIdx = rootIdx > -1 ? rootIdx : 0;
    const targetY = safeIdx * FIXED_GAP;

    // Use a small delay to ensure the native view is mounted and registered with Reanimated
    const timeout = setTimeout(() => {
      runOnUI(() => {
        'worklet';
        try {
          scrollTo(scrollRef, 0, targetY, false);
        } catch (e) {}
      })();
    }, 100);

    activeNodeOriginY.value = paddingBefore;
    activeNodeOriginX.value = focusAxisX;
    activeCluster.value = 1;
    clusterMinY.value = 0;

    return () => {
      clearTimeout(timeout);
      cancelAnimation(activeCluster);
      cancelAnimation(activeNodeOriginY);
      cancelAnimation(activeNodeOriginX);
      cancelAnimation(clusterMinY);
    };
  }, [rootNode.id]);

  const scrollHandler = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });
  const focusIdToIndex: Record<string, number> = {};
  clusterNotes.forEach((n: any, i: number) => { focusIdToIndex[n.id] = i; });

  const DropAndBounce = () => {
    'worklet';
    return {
      initialValues: { transform: [{ translateY: -500 }, { scale: 0.9 }], opacity: 0 },
      animations: {
        transform: [{ translateY: withSpring(0, { damping: 10, stiffness: 95, mass: 1 }) }, { scale: withSpring(1) }],
        opacity: withSpring(1),
      },
    };
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: isDark ? NightTheme.background : '#FFFFFF' }]}>
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
                      return <AnimatedOverlayPath key={`line-${node.id}`} node={{ ...node, clusterIndex: idx }} targetNode={{ ...gTarget, clusterIndex: fIdx }} activeCluster={activeCluster} activeNodeOriginY={activeNodeOriginY} activeNodeOriginX={activeNodeOriginX} rootCategories={rootNode.categories} />;
                    })}
                    {clusterNotes.map((node: any, idx: number) => (
                      <AnimatedNodeDot key={`dot-${node.id}`} node={{ ...node, clusterIndex: idx }} activeCluster={activeCluster} activeNodeOriginY={activeNodeOriginY} activeNodeOriginX={activeNodeOriginX} rootCategories={rootNode.categories} isDark={isDark} />
                    ))}
                  </Svg>
                </View>
                <View style={{ marginTop: paddingBefore }} pointerEvents="box-none">
                  {clusterNotes.map((node: any, idx: number) => (
                    <AnimatedNoteCard key={node.id} node={{ ...node, clusterIndex: idx, paddingBefore }} activeCluster={activeCluster} activeNodeOriginY={activeNodeOriginY} activeNodeOriginX={activeNodeOriginX} onExpandNode={setReadingNode} rootCategories={rootNode.categories} isDark={isDark} />
                  ))}
                </View>
              </View>
            </Animated.ScrollView>
            <ScrubHint axisX={focusAxisX} />
          </View>
        </GestureDetector>
        {readingNode && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)', zIndex: 200, justifyContent: 'center', alignItems: 'center' }]}>
            <GestureDetector gesture={closeReadingNodeTap}><Animated.View style={StyleSheet.absoluteFill} /></GestureDetector>
            <Animated.View 
              entering={DropAndBounce}
              exiting={FadeOut.duration(200)}
              style={{ width: '85%', maxHeight: '70%', padding: 36, backgroundColor: isDark ? NightTheme.surface : '#FFFFFF', borderRadius: 16, shadowColor: '#000000', shadowOpacity: isDark ? 0.4 : 0.08, shadowRadius: 30, elevation: 10 }}
            >
              <Text style={[styles.noteCategory, { color: CATEGORY_COLORS[readingNode.categories[0]] || '#BBBBBB', marginBottom: 12 }]}>{readingNode.categories.join(' + ')} — SYNTHESIS</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {readingNode.images && readingNode.images.length > 0 && (
                  <Image source={{ uri: readingNode.images[0] }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 16 }} transition={200} contentFit="cover" />
                )}
                <Text style={[styles.noteContent, { fontSize: 24, lineHeight: 36, color: isDark ? NightTheme.textPrimary : '#111111' }]}>{readingNode.content}</Text>
              </ScrollView>
            </Animated.View>
          </Animated.View>
        )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 17, fontWeight: '300', lineHeight: 28, color: '#111111' },
});
