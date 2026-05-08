import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';
import { growKnowledgeTree } from '@/utils/studioUtils';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolate,
  FadeIn,
  interpolate,
  SharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import Svg, { Defs, Path, Stop, Circle as SvgCircle, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { useShallow } from 'zustand/react/shallow';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const BlinkingStar = () => {
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.2, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: withRepeat(withTiming(1.1, { duration: 1200 }), -1, true) }]
  }));

  return (
    <Animated.View style={[{ marginBottom: 24 }, animatedStyle]}>
      <Star size={24} color="#8E44AD" fill="#8E44AD" />
    </Animated.View>
  );
};

const { width: W, height: H } = Dimensions.get('window');

// --- Layout Constants ---
const GLASS_W = W * 0.85;
const GLASS_H = H * 0.45;
const SKEL_RADIUS = Math.min(GLASS_W, GLASS_H) * 0.35;
const DETAIL_RADIUS = W * 0.85; 
const STAGE_SIZE = W * 12.0; // Dramatically expanded to ensure the SVG canvas is never clipped under stress-test filament extension

const ORBIT_R = H * 1.8;
const ORBIT_CY = H * 1.8 + H / 2; // Mathematical center calculation

// --- Unique Constellation Generator ---
const getNoteMetadata = (note: any) => {
  if (!note?.entities_json) return { category: 'Journal', emotion: 'Neutral', resonances: {} };
  try {
    const parsed = JSON.parse(note.entities_json);
    return {
      category: parsed.category || 'Journal',
      emotion: parsed.emotion || 'Neutral',
      resonances: parsed.resonances || {}
    };
  } catch (e) {
    return { category: 'Journal', emotion: 'Neutral', resonances: {} };
  }
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateConstellation(seedId: string, noteCount: number): { x: number, y: number, r: number, angle: number }[] {
  if (noteCount === 0) return [];
  const hash = hashCode(seedId);
  const rng = seededRandom(hash);
  const points: { x: number, y: number, r: number, angle: number }[] = [];
  const count = Math.min(noteCount, 20); // Bumping to 20 for stress testing

  // Constants for overlap detection (approximate card dimensions)
  const CARD_COLLISION_W = 220; 
  const CARD_COLLISION_H = 120;
  const DR = W * 0.85; // local reflection of DETAIL_RADIUS

  for (let i = 0; i < count; i++) {
    const baseAngle = (i / count) * Math.PI * 2;
    const angle = baseAngle + (rng() * 1.0 - 0.5);
    let radius = 0.4 + rng() * 0.8;

    // --- Dynamic Overlap Prevention ---
    // Check if this card overlaps with any previously placed cards
    let collision = true;
    let iterations = 0;
    
    while (collision && iterations < 20) { // Increased iterations for higher density
      collision = false;
      const curX = Math.cos(angle) * radius * DR;
      const curY = Math.sin(angle) * radius * DR;
      
      for (let j = 0; j < points.length; j++) {
        const otherX = Math.cos(points[j].angle) * points[j].r * DR;
        const otherY = Math.sin(points[j].angle) * points[j].r * DR;
        
        const dx = Math.abs(curX - otherX);
        const dy = Math.abs(curY - otherY);
        
        // If cards overlap, push this one further out
        if (dx < CARD_COLLISION_W && dy < CARD_COLLISION_H) {
          radius += 0.3; // Selective extension
          collision = true;
          break;
        }
      }
      iterations++;
    }

    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      r: radius,
      angle: angle,
    });
  }
  return points;
}

function getSecondaryFilaments(points: any[], seedId: string): [number, number][] {
  const hash = hashCode(seedId);
  const links: [number, number][] = [];
  if (points.length < 3) return [];

  // Deterministically create 1-2 cross-links based on hash
  if (hash % 3 === 0) links.push([0, Math.floor(points.length / 2)]);
  if (hash % 5 === 0 && points.length > 4) links.push([1, points.length - 1]);

  return links;
}

// --- Components ---

const DetailView = ({ branch, visible, onClose }: { branch: any, visible: boolean, onClose: () => void }) => {
  const isDark = useNotesStore(s => s.theme) === 'dark';
  const scrollRef = useRef<ScrollView>(null);
  const baseScale = useSharedValue(1);
  const pinchScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Safely extract dependencies for hooks so they can run unconditionally
  const seedId = branch?.seedNote?.id || '';
  const connectedLength = branch?.connectedNotes?.length || 0;

  const constellation = useMemo(() => generateConstellation(seedId, connectedLength), [seedId, connectedLength]);

  // Dynamically calculate canvas size based on EXACT bounding box of the constellation
  const { stageW, stageH, cx, cy } = useMemo(() => {
    let minX = 0, maxX = 0;
    let minY = 0, maxY = 0;

    for (const pt of constellation) {
      const px = pt.x * DETAIL_RADIUS;
      const py = pt.y * DETAIL_RADIUS;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    // Add exactly enough padding to hold the card dimensions and some breathing room
    const PADDING_W = W * 0.8; 
    const PADDING_H = H * 0.6;

    return {
      stageW: (maxX - minX) + PADDING_W * 2,
      stageH: (maxY - minY) + PADDING_H * 2,
      cx: Math.abs(minX) + PADDING_W,
      cy: Math.abs(minY) + PADDING_H
    };
  }, [constellation]);

  const clampPan = (currentScale: number) => {
    'worklet';
    // Precise bounds: Difference between scaled map size and screen size
    const maxPanX = Math.max(0, (stageW * currentScale - W) / 2);
    const maxPanY = Math.max(0, (stageH * currentScale - H) / 2);
    
    let targetX = translateX.value;
    let targetY = translateY.value;

    if (targetX > maxPanX) targetX = maxPanX;
    if (targetX < -maxPanX) targetX = -maxPanX;
    if (targetY > maxPanY) targetY = maxPanY;
    if (targetY < -maxPanY) targetY = -maxPanY;

    translateX.value = withSpring(targetX, { damping: 25, stiffness: 250 });
    translateY.value = withSpring(targetY, { damping: 25, stiffness: 250 });
    savedTranslateX.value = targetX;
    savedTranslateY.value = targetY;
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const s = baseScale.value * pinchScale.value;
      const maxPanX = Math.max(0, (stageW * s - W) / 2);
      const maxPanY = Math.max(0, (stageH * s - H) / 2);
      
      let tx = savedTranslateX.value + event.translationX;
      let ty = savedTranslateY.value + event.translationY;

      // Soft rubber-banding on pan edges
      if (tx > maxPanX) tx = maxPanX + (tx - maxPanX) * 0.3;
      if (tx < -maxPanX) tx = -maxPanX + (tx + maxPanX) * 0.3;
      if (ty > maxPanY) ty = maxPanY + (ty - maxPanY) * 0.3;
      if (ty < -maxPanY) ty = -maxPanY + (ty + maxPanY) * 0.3;

      translateX.value = tx;
      translateY.value = ty;
    })
    .onEnd(() => {
      const s = baseScale.value * pinchScale.value;
      clampPan(s);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      pinchScale.value = event.scale;
    })
    .onEnd(() => {
      // Hard clamp the base scale on release
      const minScale = Math.max(0.4, Math.min(W / stageW, H / stageH));
      const maxScale = 1.6;
      let finalScale = baseScale.value * pinchScale.value;
      
      if (finalScale < minScale) finalScale = minScale;
      if (finalScale > maxScale) finalScale = maxScale;

      baseScale.value = finalScale;
      pinchScale.value = 1;
      clampPan(finalScale); // Secure map boundaries against new zoom level
    });

  const zoomStyle = useAnimatedStyle(() => {
    const minScale = Math.max(0.4, Math.min(W / stageW, H / stageH));
    const maxScale = 1.6;
    let s = baseScale.value * pinchScale.value;

    // Apply soft rubber-banding if dragging past limits
    if (s < minScale) {
       s = minScale - (minScale - s) * 0.3;
    } else if (s > maxScale) {
       s = maxScale + (s - maxScale) * 0.3;
    }

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: s }
      ],
    };
  });

  // Reset Zoom and Center view on open
  useEffect(() => {
    if (visible) {
      baseScale.value = 1;
      pinchScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible, seedId]);

  if (!branch) return null;
  const seed = branch.seedNote;
  const isRefining = seed.is_refining;
  const { category, emotion } = getNoteMetadata(seed);
  const connected = branch.connectedNotes;
  const accent = CATEGORY_COLORS[category] || NightTheme.accent;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.detailContainer, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
        <BlurView intensity={isDark ? 95 : 85} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />

        <GestureHandlerRootView style={StyleSheet.absoluteFill}>
          <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }]} collapsable={false}>
              <Animated.View style={[{ width: stageW, height: stageH }, zoomStyle]}>
                <View style={StyleSheet.absoluteFill}>
                  {/* The Constellation Filaments */}
                  <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <Svg width={stageW} height={stageH}>
                      <Defs>
                        <SvgLinearGradient id="filamentGrad" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0" stopColor={accent} stopOpacity={isDark ? "0.1" : "0.05"} />
                          <Stop offset="0.5" stopColor={accent} stopOpacity={isDark ? "0.5" : "0.3"} />
                          <Stop offset="1" stopColor={accent} stopOpacity={isDark ? "0.1" : "0.05"} />
                        </SvgLinearGradient>
                      </Defs>

                      {/* Radially radiating filaments — now the only lines */}

                      {/* Main radiating filaments */}
                      {constellation.map((pt, idx) => (
                        <Path
                          key={`l-${idx}`}
                          d={`M ${cx} ${cy} L ${cx + pt.x * DETAIL_RADIUS} ${cy + pt.y * DETAIL_RADIUS}`}
                          stroke="url(#filamentGrad)"
                          strokeWidth="1.5"
                          opacity={0.6}
                        />
                      ))}

                      {/* Focal hub intersection is now clean with no surrounding circles */}
                    </Svg>
                  </View>

                  {/* The central hub dot — moved to its own layer to ensure it's exact center */}
                  <View style={{ 
                    position: 'absolute', 
                    left: cx - 9, 
                    top: cy - 9, 
                    width: 18, 
                    height: 18, 
                    borderRadius: 9, 
                    backgroundColor: accent, 
                    shadowColor: accent, 
                    shadowRadius: 15, 
                    shadowOpacity: 0.8,
                    zIndex: 100 
                  }} />

                  {/* The central hub label — positioned relative to center so it doesn't push the dot */}
                  <View style={{ 
                    position: 'absolute', 
                    left: cx - 70, 
                    top: cy + 15, 
                    width: 140, 
                    alignItems: 'center',
                    zIndex: 100 
                  }}>
                    <View style={[styles.detailSeedLabel, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]}>
                      <Text style={[styles.detailSeedText, { color: isDark ? '#E8E6E0' : '#111111' }]} numberOfLines={2}>
                        {isRefining ? 'SYNTHESIZING STELLAR COORDINATES...' : seed.content}
                      </Text>
                    </View>
                  </View>

                  {constellation.map((pt, idx) => {
                    const note = connected[idx];
                    if (!note || note.is_refining) return null; // DOUBLE FILTER: Just in case

                    return (
                      <View
                        key={`n-${note.id}`}
                        style={[
                          styles.noteCardWrapper,
                          { left: cx + pt.x * DETAIL_RADIUS - 100, top: cy + pt.y * DETAIL_RADIUS - 50 }
                        ]}
                      >
                        <View style={[styles.noteGlass, { borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                          <BlurView intensity={isDark ? 25 : 45} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
                          <View style={[styles.starDotInner, { backgroundColor: isDark ? '#FFF' : '#000' }]} />
                          <Text style={[styles.starCardText, { color: isDark ? '#E8E6E0' : '#111111' }]} numberOfLines={5}>{note.content || 'Synthesizing...'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            </View>
          </GestureDetector>
        </GestureHandlerRootView>

        <View style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
          <Pressable onPress={onClose}>
            <Text style={[styles.closeText, { color: isDark ? '#FFF' : '#111' }]}>{isRefining ? 'STILL SYNTHESIZING' : 'CLOSE ORBIT'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const ConstellationWindow = ({ branch, index, scrollX, onExpand }: { branch: any, index: number, scrollX: SharedValue<number>, onExpand: () => void }) => {
  const isDark = useNotesStore(s => s.theme) === 'dark';
  if (!branch) return null;
  const seed = branch.seedNote;
  const isRefining = seed.is_refining;
  const { category } = getNoteMetadata(seed);
  const connected = branch.connectedNotes;
  const accent = CATEGORY_COLORS[category] || NightTheme.accent;

  // Parse accent hex to rgba for fine-grained control
  const accentR = parseInt(accent.slice(1, 3), 16);
  const accentG = parseInt(accent.slice(3, 5), 16);
  const accentB = parseInt(accent.slice(5, 7), 16);
  const accentRgba = (a: number) => `rgba(${accentR},${accentG},${accentB},${a})`;

  const constellation = useMemo(() => generateConstellation(seed.id, connected.length), [seed.id, connected.length]);

  const textColor = isDark ? '#E8E6E0' : '#FFFFFF';

  const animatedStyle = useAnimatedStyle(() => {
    const diff = (scrollX.value / W) - index;
    const angle = -diff * (Math.PI / 10);
    const tx = ORBIT_R * Math.sin(angle);
    const ty = ORBIT_R * (1 - Math.cos(angle));

    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: interpolate(Math.abs(diff), [0, 1], [1, 0.85], Extrapolate.CLAMP) },
        { rotate: `${-diff * 8}deg` }
      ],
      opacity: interpolate(Math.abs(diff), [0, 0.5, 1], [1, 0.4, 0], Extrapolate.CLAMP),
    };
  });

  const cx = GLASS_W / 2;
  const cy = GLASS_H / 2;

  return (
    <Animated.View style={[styles.windowWrapper, animatedStyle]}>
      <Pressable onPress={onExpand} style={styles.glassCapsule}>

        {/* === LAYER 0: Chromatic Ambient Bleed === */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'hidden' }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: accentRgba(isDark ? 0.15 : 0.22) }]} />
          <LinearGradient
            colors={[accentRgba(isDark ? 0.4 : 0.5), accentRgba(isDark ? 0.12 : 0.18), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* === LAYER 1: Skeleton (drawn first, on raw color) === */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'hidden' }]} pointerEvents="none">
          <Svg width={GLASS_W} height={GLASS_H}>
            {constellation.map((pt, idx) => {
              const ex = cx + pt.x * SKEL_RADIUS;
              const ey = cy + pt.y * SKEL_RADIUS;
              const d = `M ${cx} ${cy} L ${ex} ${ey}`;
              return (
                <React.Fragment key={`gl-${idx}`}>
                  <Path d={d} stroke={accent} strokeWidth="5" opacity={0.12} strokeLinecap="round" />
                  <Path d={d} stroke={accent} strokeWidth="2" opacity={1} strokeLinecap="round" />
                  <Path d={d} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" opacity={1} strokeLinecap="round" />
                  <SvgCircle cx={ex} cy={ey} r={5} fill={accent} opacity={1} />
                  <SvgCircle cx={ex} cy={ey} r={2.5} fill="rgba(255,255,255,0.7)" opacity={1} />
                  <SvgCircle cx={ex} cy={ey} r={8} stroke={accent} strokeWidth="0.8" fill="none" opacity={0.6} />
                  <SvgCircle cx={ex} cy={ey} r={12} stroke={accent} strokeWidth="0.5" fill="none" opacity={0.25} />
                </React.Fragment>
              );
            })}
            {/* Hub Core — Clean intersection with no surrounding rings */}
            <SvgCircle cx={cx} cy={cy} r={7} fill={accent} opacity={1} />
            <SvgCircle cx={cx} cy={cy} r={3} fill="rgba(255,255,255,0.85)" opacity={1} />
          </Svg>
        </View>

        {/* === LAYER 2: Single light BlurView on top — gives reflective frosted feel === */}
        <BlurView intensity={5} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { borderRadius: 32 }]} />

        {/* === LAYER 3: Prismatic Sheen === */}
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.04)', 'transparent', accentRgba(0.07), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.4 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
        />

        {/* === LAYER 4: Content === */}
        <View style={styles.seedCenter}>
          <View style={[styles.catPill, { backgroundColor: accentRgba(0.25), borderColor: accentRgba(0.5) }]}>
            <Text style={[styles.catPillText, { color: accent }]}>
              {isRefining ? 'SYNTHESIZING' : category.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.seedContent, { color: textColor }]} numberOfLines={3}>
            {isRefining ? 'Building stellar coordinates...' : seed.content}
          </Text>
          <Text style={[styles.seedMeta, { color: accentRgba(0.9) }]}>
            {isRefining ? '...' : `${connected.length} RESONATING NODES`}
          </Text>
        </View>

        {/* === BORDER === */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: 32, borderWidth: 1, borderColor: accentRgba(isDark ? 0.4 : 0.3) }]} />
      </Pressable>
    </Animated.View>
  );
};

const StellarToggle = ({ mode, onToggle }: { mode: 'orbit' | 'list', onToggle: () => void }) => {
  const isDark = useNotesStore(s => s.theme) === 'dark';
  const isOrbit = mode === 'orbit';
  const progress = useSharedValue(isOrbit ? 0 : 1);
  const twinkle = useSharedValue(0.4);

  useEffect(() => {
    progress.value = withSpring(isOrbit ? 0 : 1, { damping: 15, stiffness: 100 });
  }, [isOrbit]);

  useEffect(() => {
    twinkle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedProps = useAnimatedProps(() => {
    // Morphing path: 
    // Orbit (progress 0) -> A hub-and-spoke star
    // List (progress 1) -> Two horizontal parallel bars
    const p = progress.value;

    // Path A coordinates (Orbit Star)
    const hubX = 24, hubY = 12;
    const s1x = interpolate(p, [0, 1], [12, 12]);
    const s1y = interpolate(p, [0, 1], [12, 8]);
    const s2x = interpolate(p, [0, 1], [36, 36]);
    const s2y = interpolate(p, [0, 1], [12, 8]);

    const s3x = interpolate(p, [0, 1], [12, 12]);
    const s3y = interpolate(p, [0, 1], [12, 16]);
    const s4x = interpolate(p, [0, 1], [36, 36]);
    const s4y = interpolate(p, [0, 1], [16, 16]);

    // Constructing morphing geometry
    if (p < 0.5) {
      // Star/Focus layout
      return { d: `M 12 12 L 36 12 M 24 4 L 24 20` };
    } else {
      // Grid/List layout
      return { d: `M 12 8 L 36 8 M 12 16 L 36 16` };
    }
  });

  const node1Props = useAnimatedProps(() => ({
    cx: withSpring(isOrbit ? 24 : 12),
    cy: withSpring(isOrbit ? 12 : 8),
    opacity: twinkle.value
  }));

  const node2Props = useAnimatedProps(() => ({
    cx: withSpring(isOrbit ? 24 : 36),
    cy: withSpring(isOrbit ? 12 : 8)
  }));

  const node3Props = useAnimatedProps(() => ({
    cx: withSpring(isOrbit ? 24 : 12),
    cy: withSpring(isOrbit ? 12 : 16)
  }));

  const node4Props = useAnimatedProps(() => ({
    cx: withSpring(isOrbit ? 24 : 36),
    cy: withSpring(isOrbit ? 12 : 16)
  }));

  return (
    <Pressable onPress={onToggle} style={styles.toggleBtn}>
      <Svg width={48} height={24} viewBox="0 0 48 24">
        <AnimatedPath
          animatedProps={animatedProps}
          stroke={NightTheme.accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={0.3}
        />

        <AnimatedCircle r={2} fill={NightTheme.accent} animatedProps={node1Props} />
        <AnimatedCircle r={2} fill="#FFF" animatedProps={node2Props} />
        <AnimatedCircle r={2} fill="#FFF" animatedProps={node3Props} />
        <AnimatedCircle r={2} fill={NightTheme.accent} animatedProps={node4Props} />

        <SvgCircle cx={6} cy={4} r={0.5} fill="#FFF" opacity={0.3} />
        <SvgCircle cx={42} cy={20} r={0.5} fill="#FFF" opacity={0.3} />
      </Svg>
    </Pressable>
  );
};

const ConstellationCard = ({ branch, onExpand }: { branch: any, onExpand: () => void }) => {
  const seed = branch.seedNote;
  const isRefining = seed.is_refining;
  const { category } = getNoteMetadata(seed);
  const accent = CATEGORY_COLORS[category] || NightTheme.accent;
  const connected = branch.connectedNotes;
  const constellation = useMemo(() => generateConstellation(seed.id, connected.length), [seed.id, connected.length]);

  const CARD_W = W - 48;
  const CARD_H = 130;
  const SKEL_W = 110;
  const SKEL_H = 110;
  const scx = SKEL_W / 2;
  const scy = SKEL_H / 2;
  const SKEL_R = 36; // radius for filament endpoints

  const isDark = useNotesStore(s => s.theme) === 'dark';

  // Parse accent for rgba
  const accentR = parseInt(accent.slice(1, 3), 16);
  const accentG = parseInt(accent.slice(3, 5), 16);
  const accentB = parseInt(accent.slice(5, 7), 16);
  const accentRgba = (a: number) => `rgba(${accentR},${accentG},${accentB},${a})`;

  return (
    <Pressable onPress={onExpand} style={[styles.listCard, { width: CARD_W, height: CARD_H }]}>

      {/* Layer 0: Chromatic color bleed */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: accentRgba(isDark ? 0.12 : 0.18), borderRadius: 24 }]} />
      <LinearGradient
        colors={[accentRgba(isDark ? 0.32 : 0.42), accentRgba(isDark ? 0.08 : 0.12), 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
      />

      {/* Layer 1: Skeleton first, on raw color */}
      <View style={styles.cardSkeletonContainer} pointerEvents="none">
        <Svg width={SKEL_W} height={SKEL_H}>
          {constellation.map((pt, idx) => {
            const ex = scx + pt.x * SKEL_R;
            const ey = scy + pt.y * SKEL_R;
            const d = `M ${scx} ${scy} L ${ex} ${ey}`;
            return (
              <React.Fragment key={`csl-${idx}`}>
                <Path d={d} stroke={accent} strokeWidth="5" opacity={0.1} strokeLinecap="round" />
                <Path d={d} stroke={accent} strokeWidth="2" opacity={1} strokeLinecap="round" />
                <Path d={d} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" opacity={1} strokeLinecap="round" />
                <SvgCircle cx={ex} cy={ey} r={4.5} fill={accent} opacity={1} />
                <SvgCircle cx={ex} cy={ey} r={2} fill="rgba(255,255,255,0.75)" opacity={1} />
                <SvgCircle cx={ex} cy={ey} r={7.5} stroke={accent} strokeWidth="0.8" fill="none" opacity={0.6} />
                <SvgCircle cx={ex} cy={ey} r={11} stroke={accent} strokeWidth="0.4" fill="none" opacity={0.25} />
              </React.Fragment>
            );
          })}
          {/* Hub Core — Crisp intersection */}
          <SvgCircle cx={scx} cy={scy} r={6} fill={accent} opacity={1} />
          <SvgCircle cx={scx} cy={scy} r={2.5} fill="rgba(255,255,255,0.85)" opacity={1} />
        </Svg>
      </View>

      {/* Layer 2: Single light BlurView on top */}
      <BlurView intensity={3} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />

      {/* Layer 3: Prismatic sheen */}
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.04)', 'transparent', accentRgba(0.06)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.20)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
      />

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={[styles.cardTag, { backgroundColor: accentRgba(0.25), borderWidth: 1, borderColor: accentRgba(0.5) }]}>
          <Text style={[styles.cardTagText, { color: accent }]}>{isRefining ? 'SYNTHESIZING' : category.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, paddingRight: SKEL_W + 8 }}>
          <Text style={[styles.cardTitle, { color: isDark ? '#E8E6E0' : '#111111' }]} numberOfLines={2}>
            {isRefining ? 'STELLAR COORDINATES IN PROGRESS...' : (seed.content || 'UNTITLED THOUGHT')}
          </Text>
          <Text style={[styles.cardSubtitle, { color: accentRgba(0.9) }]}>
            {isRefining ? 'PENDING RESONANCE' : `${connected.length} RESONATING NODES`}
          </Text>
        </View>
      </View>

      {/* Accent rim border */}
      <View style={[StyleSheet.absoluteFill, { borderRadius: 24, borderWidth: 1, borderColor: accentRgba(isDark ? 0.3 : 0.2) }]} />
    </Pressable>
  );
};

const ANGLE_STEP = Math.PI / 10;

export default function StudioV9() {
  const insets = useSafeAreaInsets();
  const theme = useNotesStore(s => s.theme);
  const notes = useNotesStore(useShallow(s => s.notes));
  const studioSeeds = useNotesStore(s => s.studioSeeds) ?? [];
  const branches = useMemo(() => growKnowledgeTree(notes, studioSeeds), [notes, studioSeeds]);

  const [viewMode, setViewMode] = useState<'orbit' | 'list'>('orbit');
  const [detailBranch, setDetailBranch] = useState<any>(null);
  const [stressTestMode, setStressTestMode] = useState(false);

  // --- Shadow Resonance Injection ---
  // If Stress Test is ON, we pad the branches to reach the 20-node limit
  const processedBranches = useMemo(() => {
    if (!stressTestMode) return branches;
    return branches.map(b => {
      const currentCount = b.connectedNotes.length;
      if (currentCount >= 20) return b;

      const dummyCount = 20 - currentCount;
      const dummies = Array.from({ length: dummyCount }).map((_, i) => ({
        id: `ghost-${b.seedNote.id}-${i}`,
        content: `[STRESS TEST ${i + 1}] This is a shadow resonance node generated to test clustering stability and filament layout at high density.`,
        entities_json: JSON.stringify({ 
          category: i % 2 === 0 ? 'Research' : 'Journal',
          emotion: 'Synthesizing'
        }),
        created_at: Date.now(),
        is_refining: false
      }));

      return {
        ...b,
        connectedNotes: [...b.connectedNotes, ...dummies]
      };
    });
  }, [branches, stressTestMode]);

  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollX.value = e.contentOffset.x; },
  });

  const toggleMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(prev => prev === 'orbit' ? 'list' : 'orbit');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { }
  };

  const isDark = theme === 'dark';
  const textColor = isDark ? '#E8E6E0' : '#111111';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: isDark ? '#000' : '#FFF' }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.title, { color: textColor }]}>DRIFT STUDIO</Text>
              <Pressable 
                onPress={() => {
                  setStressTestMode(!stressTestMode);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                style={{ 
                  paddingHorizontal: 6, 
                  paddingVertical: 2, 
                  borderRadius: 4, 
                  backgroundColor: stressTestMode ? '#E74C3C' : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: stressTestMode ? '#E74C3C' : 'rgba(255,255,255,0.1)'
                }}
              >
                <Text style={{ fontSize: 7, fontWeight: '900', color: stressTestMode ? '#FFF' : 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>STRESS</Text>
              </Pressable>
            </View>
            <Text style={styles.subtitle}>STELLAR CHRONICLE</Text>
          </View>
          <StellarToggle mode={viewMode} onToggle={toggleMode} />
        </View>
      </View>

      {processedBranches.length === 0 ? (
        <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
          <BlinkingStar />
          <Text style={[styles.emptyTextTitle, { color: textColor }]}>Igniting the Stellar Forge</Text>
          <Text style={styles.emptyTextSub}>Long-press any note in the map to seed your studio.</Text>
        </Animated.View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {viewMode === 'orbit' ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Animated.FlatList
                data={processedBranches}
                renderItem={({ item, index }) => (
                  <ConstellationWindow branch={item} index={index} scrollX={scrollX} onExpand={() => { setDetailBranch(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }} />
                )}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                keyExtractor={item => item.seedNote.id}
                contentContainerStyle={{ alignItems: 'center' }}
              />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.listContainer, { paddingTop: 20 }]}
              showsVerticalScrollIndicator={false}
            >
              {processedBranches.map((branch) => (
                <ConstellationCard
                  key={branch.seedNote.id}
                  branch={branch}
                  onExpand={() => setDetailBranch(branch)}
                />
              ))}
            </ScrollView>
          )}

          {viewMode === 'orbit' && (
            <View style={[styles.indicatorContainer, { bottom: insets.bottom + 40 }]}>
              {processedBranches.map((_, i) => <PageDot key={i} index={i} scrollX={scrollX} />)}
            </View>
          )}
        </View>
      )}

      <DetailView branch={detailBranch} visible={!!detailBranch} onClose={() => setDetailBranch(null)} />
    </View>
  );
}

const PageDot = ({ index, scrollX }: { index: number, scrollX: SharedValue<number> }) => {
  const style = useAnimatedStyle(() => {
    const active = interpolate(scrollX.value / W, [index - 1, index, index + 1], [0.3, 1, 0.3], Extrapolate.CLAMP);
    return { opacity: active, transform: [{ scale: active }] };
  });
  return <Animated.View style={[styles.pageDot, style]} />;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingBottom: 10, zIndex: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 24,
  },
  title: { fontSize: 21, fontWeight: '300', letterSpacing: 3, textTransform: 'uppercase' },
  subtitle: { fontSize: 9, fontWeight: '700', color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 3, marginTop: 6 },
  toggleBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(124, 58, 237, 0.1)' },
  emptyState: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  emptyTextTitle: {
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyTextSub: {
    fontSize: 8,
    color: '#8E44AD',
    textTransform: 'uppercase',
    letterSpacing: 2.0,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  listContainer: { paddingHorizontal: 24, paddingBottom: 150, paddingTop: 20 },
  listCard: { borderRadius: 24, marginBottom: 16, overflow: 'hidden' },
  cardSkeletonContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 110, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, padding: 20, justifyContent: 'center' },
  cardTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 8 },
  cardTagText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { fontSize: 16, fontWeight: '300', lineHeight: 22, letterSpacing: 0.5 },
  cardSubtitle: { fontSize: 9, marginTop: 6, color: '#8E44AD', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  windowWrapper: { width: W, height: H, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  glassCapsule: {
    width: GLASS_W,
    height: GLASS_H,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  seedCenter: { justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 24 },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  catPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  seedContent: { fontSize: 16, fontWeight: '300', lineHeight: 24, textAlign: 'center', opacity: 0.92 },
  seedMeta: { fontSize: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8 },
  seedDot: { width: 12, height: 12, borderRadius: 6, shadowRadius: 15, shadowOpacity: 1 },
  seedLabel: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', width: 150, opacity: 0.8 },

  detailContainer: { flex: 1, backgroundColor: '#000' },
  detailSeedCore: { position: 'absolute', width: 120, height: 120, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  detailSeedDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowRadius: 20, shadowOpacity: 1 },
  detailSeedLabel: { marginTop: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  detailSeedText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', width: 140 },

  noteCardWrapper: { position: 'absolute', width: 200, zIndex: 10 },
  noteGlass: {
    padding: 16,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 8,
  },
  starDotInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF', opacity: 0.8 },
  starCardText: { color: '#EEE', fontSize: 12, fontWeight: '300', textAlign: 'center', lineHeight: 18 },

  closeBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  closeText: { color: '#FFF', fontSize: 9, fontWeight: '700', letterSpacing: 3 },

  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  indicatorContainer: { position: 'absolute', alignSelf: 'center', flexDirection: 'row' },
});
