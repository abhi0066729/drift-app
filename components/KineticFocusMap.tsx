import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNotesStore, Note } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/Categories';
import ReadingModal from './ReadingModal';
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
import Svg, { Circle, Path, G } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SPRING_CONFIG = { damping: 24, stiffness: 120, overshootClamping: true };

// --- ScrubHint Component ---
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
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: axisX - 30, top: height / 2 - 30, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(142, 68, 173, 0.1)', borderWidth: 1, borderColor: 'rgba(142, 68, 173, 0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }, animatedStyle]}>
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

// --- DUO S-CURVE (Primary & Secondary Strands) ---
function AnimatedOverlayPath({ node, targetNode, activeCluster, activeNodeOriginY, activeNodeOriginX, rootColor, secondaryColor, secondaryWeight }: any) {
  const sY = useDerivedValue(() => withSpring(getTargetY(node, activeCluster, activeNodeOriginY), SPRING_CONFIG));
  const sX = useDerivedValue(() => withSpring(getTargetX(node, activeCluster, activeNodeOriginX), SPRING_CONFIG));
  const eY = useDerivedValue(() => withSpring(getTargetY(targetNode, activeCluster, activeNodeOriginY), SPRING_CONFIG));
  const eX = useDerivedValue(() => withSpring(getTargetX(targetNode, activeCluster, activeNodeOriginX), SPRING_CONFIG));

  const animatedPropsPrimary = useAnimatedProps(() => {
    const dy = Math.abs(eY.value - sY.value);
    const tangent = Math.max(160, dy * 0.6);
    return {
      d: `M ${sX.value} ${sY.value} C ${sX.value} ${sY.value + tangent}, ${eX.value} ${eY.value - tangent}, ${eX.value} ${eY.value}`,
      stroke: rootColor,
      strokeWidth: withTiming(node.importance * 1.5 + 0.5),
      opacity: withTiming(node.ageFade * 0.4),
    };
  });

  const animatedPropsSecondary = useAnimatedProps(() => {
    const dy = Math.abs(eY.value - sY.value);
    const tangent = Math.max(160, dy * 0.6);
    const OFFSET = 4;
    return {
      d: `M ${sX.value + OFFSET} ${sY.value} C ${sX.value + OFFSET} ${sY.value + tangent}, ${eX.value + OFFSET} ${eY.value - tangent}, ${eX.value + OFFSET} ${eY.value}`,
      stroke: secondaryColor || rootColor,
      strokeWidth: withTiming(secondaryWeight ? (1.5 * secondaryWeight) : 0.5),
      opacity: withTiming(secondaryWeight ? (node.ageFade * 0.2 * secondaryWeight) : 0),
    };
  });

  return (
    <G>
      <AnimatedPath fill="none" animatedProps={animatedPropsPrimary} />
      {secondaryWeight > 0.05 && <AnimatedPath fill="none" animatedProps={animatedPropsSecondary} />}
    </G>
  );
}

function AnimatedNodeDot({ node, activeCluster, activeNodeOriginY, activeNodeOriginX, rootColor }: any) {
  const currentY = useDerivedValue(() => withSpring(getTargetY(node, activeCluster, activeNodeOriginY), SPRING_CONFIG));
  const currentX = useDerivedValue(() => withSpring(getTargetX(node, activeCluster, activeNodeOriginX), SPRING_CONFIG));
  
  const animatedPropsCore = useAnimatedProps(() => ({
    cx: currentX.value, cy: currentY.value,
    r: node.nodeRadius * 1.2,
    fill: rootColor,
    opacity: withTiming(node.ageFade > 0.5 ? 1.0 : 0.8),
  }));

  return <AnimatedCircle animatedProps={animatedPropsCore} />;
}

function AnimatedNoteCard({ node, activeCluster, activeNodeOriginY, activeNodeOriginX, onExpandNode, isDark }: any) {
  const currentY = useDerivedValue(() => withSpring(getTargetY(node, activeCluster, activeNodeOriginY), SPRING_CONFIG));
  const currentX = useDerivedValue(() => withSpring(getTargetX(node, activeCluster, activeNodeOriginX), SPRING_CONFIG));
  
  const animatedStyle = useAnimatedStyle(() => {
    const axisX = currentX.value;
    const PADDING = 60;
    const SAFETY_MARGIN = 20;
    let cardWidth = width * 0.55;
    let leftPosition = 0;
    
    if (axisX > width / 2) { 
       leftPosition = SAFETY_MARGIN;
       cardWidth = Math.max(120, axisX - PADDING - SAFETY_MARGIN);
    } else { 
       leftPosition = axisX + PADDING;
       cardWidth = Math.max(120, width - axisX - PADDING - SAFETY_MARGIN);
    }
    
    return {
      top: currentY.value - node.paddingBefore - 44,
      left: withSpring(leftPosition, SPRING_CONFIG),
      width: withSpring(cardWidth, SPRING_CONFIG),
      opacity: node.ageFade,
    };
  });
  
  const tap = Gesture.Tap().onEnd(() => { 'worklet'; runOnJS(onExpandNode)(node); });
  const sortedRes = Object.entries(node.resonances || {}).sort((a: any, b: any) => b[1] - a[1]);
  
  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', zIndex: 2 }, animatedStyle]}>
      <GestureDetector gesture={tap}>
        <Animated.View style={{ paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
            {sortedRes.slice(0, 2).map(([cat, weight]: any) => (
              <Text key={cat} style={[styles.noteCategory, { color: CATEGORY_COLORS[cat] || '#BBBBBB', fontSize: 8 }]}>
                {cat} {weight < 0.9 ? `${Math.round(weight * 100)}%` : ''}
              </Text>
            ))}
          </View>
          <Text numberOfLines={2} style={[styles.noteContent, { color: isDark ? NightTheme.textPrimary : '#111111', fontSize: 13, lineHeight: 20 }]}>
            {node.content}
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export default function KineticFocusMap({ rootNode, mappedNotes, onClose }: any) {
  const insets = useSafeAreaInsets();
  const theme = useNotesStore(state => state.theme);
  const isDark = theme === 'dark';
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const [readingNode, setReadingNode] = useState<any>(null);

  if (!rootNode) return null;

  const rootRes = rootNode.resonances || {};
  const rootMainCat = Object.keys(rootRes).sort((a,b) => rootRes[b] - rootRes[a])[0];

  const clusterNotes = useMemo(() => {
    if (!rootNode || !rootMainCat) return [];
    
    return mappedNotes.filter((n: Note) => {
      const nodeRes = n.resonances || {};
      const sorted = Object.keys(nodeRes).sort((a,b) => nodeRes[b] - nodeRes[a]);
      // STRICT FILTERING: Only show notes that share the SAME PRIMARY category as the root
      return sorted[0] === rootMainCat;
    }).map((node: Note) => {
      let resonances: Record<string, number> = node.resonances || {};
      if (Object.keys(resonances).length === 0 && node.entities_json) {
        try { resonances = JSON.parse(node.entities_json).resonances || {}; } catch (e) {}
      }
      return { ...node, resonances };
    });
  }, [rootNode, mappedNotes, rootMainCat]);

  const paddingBefore = 240; // Unified padding for title space
  const FIXED_GAP = 180;
  const localTotalHeight = paddingBefore + clusterNotes.length * FIXED_GAP + 200;
  const focusAxisX = rootNode.isRight ? width - 50 : 50;
  const rootColor = CATEGORY_COLORS[rootMainCat] || '#8E44AD';

  const activeCluster = useSharedValue(1);
  const activeNodeOriginY = useSharedValue(paddingBefore);
  const activeNodeOriginX = useSharedValue(focusAxisX);
  const scrollY = useSharedValue(0);
  const startScrollY = useSharedValue(0);

  useEffect(() => {
    const rootIdx = clusterNotes.findIndex((c: any) => c.id === rootNode.id);
    const targetY = (rootIdx > -1 ? rootIdx : 0) * FIXED_GAP + (paddingBefore / 2);
    setTimeout(() => {
      runOnUI(() => { 'worklet'; try { scrollTo(scrollRef, 0, targetY, false); } catch (e) {} })();
    }, 100);
  }, [rootNode.id]);

  const scrollHandler = useAnimatedScrollHandler({ onScroll: (event) => { scrollY.value = event.contentOffset.y; } });

  const scrubberPan = Gesture.Pan().activateAfterLongPress(250)
    .onStart(() => { 'worklet'; startScrollY.value = scrollY.value; })
    .onUpdate((event) => {
      'worklet';
      const newY = Math.max(0, startScrollY.value + event.translationY * 3.5);
      scrollTo(scrollRef, 0, newY, false);
    });

  const backTap = Gesture.Tap().onEnd(() => { 'worklet'; runOnJS(onClose)(); });

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}>
      <GestureDetector gesture={Gesture.Simultaneous(scrubberPan, backTap)}>
        <View style={{ flex: 1 }}>
          <Animated.ScrollView ref={scrollRef} onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ height: localTotalHeight, width: '100%' }} showsVerticalScrollIndicator={false} pointerEvents="box-none">
            <View style={{ flex: 1 }} pointerEvents="box-none">
              
              <View style={[styles.header, { marginTop: insets.top + 20 }]}>
                <Text style={styles.headerSubtitle}>RESONANCE SPECTRUM</Text>
                <Text style={[styles.headerTitle, { color: rootColor }]}>{rootMainCat.toUpperCase()}</Text>
              </View>

              <View style={{ height: paddingBefore }} />

              <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
                <Svg width="100%" height={localTotalHeight}>
                  {clusterNotes.map((node: any, idx: number) => {
                    if (idx === clusterNotes.length - 1) return null;
                    const nextNode = clusterNotes[idx + 1];
                    const sortedRes = Object.entries(node.resonances || {}).sort((a: any, b: any) => b[1] - a[1]);
                    const secCat = sortedRes[1] ? sortedRes[1][0] : null;
                    const secWeight = sortedRes[1] ? sortedRes[1][1] : 0;
                    
                    return (
                      <AnimatedOverlayPath 
                        key={`line-${node.id}`} 
                        node={{ ...node, clusterIndex: idx }} 
                        targetNode={{ ...nextNode, clusterIndex: idx + 1 }} 
                        activeCluster={activeCluster} 
                        activeNodeOriginY={activeNodeOriginY} 
                        activeNodeOriginX={activeNodeOriginX} 
                        rootColor={rootColor}
                        secondaryColor={secCat ? CATEGORY_COLORS[secCat] : null}
                        secondaryWeight={secWeight}
                      />
                    );
                  })}
                  {clusterNotes.map((node: any, idx: number) => (
                    <AnimatedNodeDot 
                      key={`dot-${node.id}`} 
                      node={{ ...node, clusterIndex: idx }} 
                      activeCluster={activeCluster} 
                      activeNodeOriginY={activeNodeOriginY} 
                      activeNodeOriginX={activeNodeOriginX} 
                      rootColor={rootColor} 
                    />
                  ))}
                </Svg>
              </View>
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {clusterNotes.map((node: any, idx: number) => (
                  <AnimatedNoteCard key={node.id} node={{ ...node, clusterIndex: idx, paddingBefore: 0 }} activeCluster={activeCluster} activeNodeOriginY={activeNodeOriginY} activeNodeOriginX={activeNodeOriginX} onExpandNode={setReadingNode} isDark={isDark} />
                ))}
              </View>
            </View>
          </Animated.ScrollView>
          <ScrubHint axisX={focusAxisX} />
        </View>
      </GestureDetector>

      {readingNode && (
        <ReadingModal node={readingNode} onClose={() => setReadingNode(null)} translucent />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 4 },
  headerTitle: { fontSize: 21, fontWeight: '300', letterSpacing: 3, textTransform: 'uppercase' },
  headerSubtitle: { fontSize: 9, fontWeight: '700', color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 3, marginTop: 6 },
  noteCategory: { fontSize: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 13, fontWeight: '300', lineHeight: 20 },
});
