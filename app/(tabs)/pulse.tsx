import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import { useShallow } from 'zustand/react/shallow';
import { growKnowledgeTree } from '@/utils/studioUtils';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  interpolate, 
  Extrapolate, 
  useAnimatedScrollHandler,
  useAnimatedProps,
  withRepeat,
  withSequence,
  Easing,
  SharedValue
} from 'react-native-reanimated';
import { LayoutAnimation } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { TapGestureHandler, State, GestureHandlerRootView, PanGestureHandler, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { SearchX, Moon, Sun, Search, Sparkles } from 'lucide-react-native';
import { seedSyntheticMemories } from '@/utils/seedingUtils';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const { width: W, height: H } = Dimensions.get('window');

// --- Layout Constants ---
const GLASS_W = W * 0.85;
const GLASS_H = H * 0.45;
const SKEL_RADIUS = Math.min(GLASS_W, GLASS_H) * 0.35;
const DETAIL_RADIUS = W * 0.85; // Increased to ensure no card overlap
const STAGE_SIZE = W * 2.5; // Larger stage for expansive scrolling depth

const ORBIT_R = H * 1.8;
const ORBIT_CY = H * 1.8 + H/2; // Mathematical center calculation

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
  const count = Math.min(noteCount, 8);

  for (let i = 0; i < count; i++) {
    // Generate organic positions with high variance in radial distance and angle
    const baseAngle = (i / count) * Math.PI * 2;
    // Add angular wobble (up to 30 degrees)
    const angle = baseAngle + (rng() * 1.0 - 0.5);
    // Add significant radial variance (0.4 to 1.3)
    const radius = 0.4 + rng() * 1.0; 
    
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
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      pinchScale.value = event.scale;
    })
    .onEnd(() => {
      baseScale.value = baseScale.value * pinchScale.value;
      pinchScale.value = 1;
    });

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: baseScale.value * pinchScale.value }],
  }));
  
  // Reset Zoom and Center view on open
  useEffect(() => {
    if (visible) {
        baseScale.value = 1;
        pinchScale.value = 1;
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ 
                    x: STAGE_SIZE/2 - W/2, 
                    y: STAGE_SIZE/2 - H/2, 
                    animated: false 
                });
            }, 50);
        }
    }
  }, [visible, branch?.seedNote?.id]);

  if (!branch) return null;
  const seed = branch.seedNote;
  const isRefining = seed.is_refining;
  const { category, emotion } = getNoteMetadata(seed);
  const connected = branch.connectedNotes;
  const accent = CATEGORY_COLORS[category] || NightTheme.accent;

  const constellation = useMemo(() => generateConstellation(seed.id, connected.length), [seed.id, connected.length]);
  const secondaryLinks = useMemo(() => getSecondaryFilaments(constellation, seed.id), [constellation, seed.id]);

  const cx = STAGE_SIZE / 2;
  const cy = STAGE_SIZE / 2;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.detailContainer, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
        <BlurView intensity={isDark ? 95 : 85} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ width: STAGE_SIZE, height: STAGE_SIZE }}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bounces={true}
          centerContent={true}
        >
          <GestureHandlerRootView style={StyleSheet.absoluteFill}>
            <GestureDetector gesture={pinchGesture}>
                <Animated.View style={[StyleSheet.absoluteFill, zoomStyle]}>
                    <View style={StyleSheet.absoluteFill}>
            {/* The Constellation Filaments */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width={STAGE_SIZE} height={STAGE_SIZE}>
                <Defs>
                  <SvgLinearGradient id="filamentGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={accent} stopOpacity={isDark ? "0.1" : "0.05"} />
                    <Stop offset="0.5" stopColor={accent} stopOpacity={isDark ? "0.5" : "0.3"} />
                    <Stop offset="1" stopColor={accent} stopOpacity={isDark ? "0.1" : "0.05"} />
                  </SvgLinearGradient>
                </Defs>

                {/* Secondary cross-filaments for complex geometry */}
                {secondaryLinks.map(([a, b], idx) => {
                  const p1 = constellation[a];
                  const p2 = constellation[b];
                  return (
                    <Path
                      key={`sl-${idx}`}
                      d={`M ${cx + p1.x * DETAIL_RADIUS} ${cy + p1.y * DETAIL_RADIUS} L ${cx + p2.x * DETAIL_RADIUS} ${cy + p2.y * DETAIL_RADIUS}`}
                      stroke="#7C3AED"
                      strokeWidth="0.8"
                      strokeDasharray="4,6"
                      opacity={isDark ? 0.3 : 0.15}
                    />
                  );
                })}

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
                
                {/* Focal Ring (The Circle that nodes run through) */}
                <SvgCircle 
                    cx={cx} 
                    cy={cy} 
                    r={35} 
                    stroke={isDark ? "rgba(124, 58, 237, 0.4)" : "rgba(124, 58, 237, 0.2)"} 
                    strokeWidth="1" 
                    fill="none" 
                />
              </Svg>
            </View>

            <View style={[styles.detailSeedCore, { left: cx - 60, top: cy - 60 }]}>
              <View style={[styles.detailSeedDot, { backgroundColor: accent, shadowColor: accent }]} />
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
            </GestureDetector>
          </GestureHandlerRootView>
        </ScrollView>

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
  const { category, emotion } = getNoteMetadata(seed);
  const connected = branch.connectedNotes;
  const accent = CATEGORY_COLORS[category] || NightTheme.accent;
  
  const constellation = useMemo(() => generateConstellation(seed.id, connected.length), [seed.id, connected.length]);
  const secondaryLinks = useMemo(() => getSecondaryFilaments(constellation, seed.id), [constellation, seed.id]);

  const textColor = isDark ? '#E8E6E0' : '#111111';
  const subTextColor = isDark ? 'rgba(232,230,224,0.4)' : 'rgba(0,0,0,0.4)';

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

  return (
    <Animated.View style={[styles.windowWrapper, animatedStyle]}>
      <Pressable 
        onPress={onExpand} 
        style={[
            styles.glassContainer, 
            { 
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.4)',
                shadowOpacity: isDark ? 0.1 : 0.15
            }
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <Svg width={GLASS_W} height={GLASS_H}>
            <Defs>
              <RadialGradient id="nodeGlow" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0%" stopColor={accent} stopOpacity={isDark ? "0.4" : "0.5"} />
                <Stop offset="100%" stopColor={accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Hub Glow */}
            <SvgCircle cx={GLASS_W/2} cy={GLASS_H/2} r={40} fill="url(#nodeGlow)" />

            {/* Triple-Layered Glow Filaments */}
            {constellation.map((pt, idx) => {
              const d = `M ${GLASS_W / 2} ${GLASS_H / 2} L ${GLASS_W / 2 + pt.x * SKEL_RADIUS} ${GLASS_H / 2 + pt.y * SKEL_RADIUS}`;
              return (
                <React.Fragment key={`gl-${idx}`}>
                  {/* Aura */}
                  <Path d={d} stroke={accent} strokeWidth="6" opacity={isDark ? 0.15 : 0.22} />
                  {/* Mid-Glow */}
                  <Path d={d} stroke={accent} strokeWidth="3" opacity={isDark ? 0.4 : 0.45} />
                  {/* Core Laser */}
                  <Path d={d} stroke={accent} strokeWidth="1.2" opacity={1} />
                </React.Fragment>
              );
            })}
          </Svg>
        </View>

        {/* Layer 1: Holographic Transparency */}
        <BlurView intensity={isDark ? 15 : 45} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        
        {/* Layer 2: Prismatic Reflection Sheet */}
        <LinearGradient 
          colors={[isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', 'transparent', accent + '22', 'transparent', isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)']} 
          start={{x: 0, y: 0}} end={{x: 1, y: 1}} 
          style={StyleSheet.absoluteFill} 
        />

        <View style={styles.seedCenter}>
           <View style={[styles.seedDot, { backgroundColor: accent, shadowColor: accent, shadowRadius: 15, shadowOpacity: 1 }]} />
           <Text style={[styles.seedLabel, { color: isDark ? '#FFF' : '#111', fontWeight: '800' }]}>
             {isRefining ? 'SYNTHESIZING...' : category.toUpperCase()}
           </Text>
           <Text style={[styles.seedLabel, { color: isDark ? '#E8E6E0' : '#111111', marginTop: 8 }]} numberOfLines={2}>
             {isRefining ? 'Building mental coordinates...' : seed.content}
           </Text>
        </View>
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
  const CARD_H = 120;

  const isDark = useNotesStore(s => s.theme) === 'dark';

  return (
    <Pressable onPress={onExpand} style={[styles.listCard, { width: CARD_W, height: CARD_H, backgroundColor: isDark ? 'transparent' : 'rgba(255,255,255,0.5)' }]}>
      {/* Background Holographic Glow */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: isDark ? 0.03 : 0.06 }]} />
      
      {/* Right-Anchored Luminous Signature */}
      <View style={styles.cardSkeletonContainer}>
        <Svg width={100} height={100}>
          {constellation.map((pt, idx) => {
             const d = `M 50 50 L ${50 + pt.x * 25} ${50 + pt.y * 25}`;
             return (
               <React.Fragment key={`csl-${idx}`}>
                  <Path d={d} stroke={accent} strokeWidth="3" opacity={isDark ? 0.2 : 0.4} />
                  <Path d={d} stroke={accent} strokeWidth="1" opacity={1} />
               </React.Fragment>
             );
          })}
          <SvgCircle cx={50} cy={50} r={5} fill={accent} opacity={1} />
        </Svg>
      </View>

      <BlurView intensity={isDark ? 12 : 20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      
      {/* Prismatic Border Highlight */}
      <View style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: isDark ? accent + '33' : accent + '11', borderRadius: 30 }]} />

      <View style={styles.cardContent}>
        <View style={[styles.cardTag, { backgroundColor: accent + '33' }]}>
            <Text style={[styles.cardTagText, { color: accent }]}>{isRefining ? 'SYNTHESIZING' : category.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, paddingRight: 80 }}>
           <Text style={[styles.cardTitle, { color: isDark ? '#E8E6E0' : '#111111' }]} numberOfLines={2}>
             {isRefining ? 'STELAR COORDINATES IN PROGRESS...' : (seed.content || 'UNTITLED THOUGHT')}
           </Text>
           <Text style={styles.cardSubtitle}>{isRefining ? 'PENDING RESONANCE' : `${connected.length} RESONATING NODES`}</Text>
        </View>
      </View>
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

  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollX.value = e.contentOffset.x; },
  });

  const toggleMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(prev => prev === 'orbit' ? 'list' : 'orbit');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
  };

  const isDark = theme === 'dark';
  const textColor = isDark ? '#E8E6E0' : '#111111';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
      <View style={[styles.header, { top: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: textColor }]}>Drift Studio</Text>
            <Text style={styles.subtitle}>STELLAR CHRONICLES</Text>
          </View>
          <StellarToggle mode={viewMode} onToggle={toggleMode} />
        </View>
      </View>

      {branches.length === 0 ? (
        <View style={styles.empty}>
           <Text style={styles.emptyText}>STUDIO IS DARK</Text>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {viewMode === 'orbit' ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <Animated.FlatList
                data={branches}
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
                contentContainerStyle={[styles.listContainer, { paddingTop: insets.top + 100 }]}
                showsVerticalScrollIndicator={false}
            >
              {branches.map((branch) => (
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
                {branches.map((_, i) => <PageDot key={i} index={i} scrollX={scrollX} />)}
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
  header: { position: 'absolute', left: 24, right: 24, zIndex: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 22 },
  title: { fontSize: 24, fontWeight: '300', letterSpacing: 1.5 },
  subtitle: { fontSize: 10, marginTop: 4, color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: '700' },
  toggleBtn: { backgroundColor: 'rgba(124, 58, 237, 0.1)', padding: 6, borderRadius: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, letterSpacing: 4, fontWeight: '700' },
  listContainer: { paddingHorizontal: 24, paddingBottom: 150, paddingTop: 20 },
  listCard: { borderRadius: 30, marginBottom: 20, overflow: 'hidden' },
  cardSkeletonContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 100, justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, padding: 20, justifyContent: 'center' },
  cardTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 8 },
  cardTagText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { fontSize: 16, fontWeight: '300', lineHeight: 22, letterSpacing: 0.5 },
  cardSubtitle: { fontSize: 9, marginTop: 6, color: '#8E44AD', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  windowWrapper: { width: W, height: H, justifyContent: 'center', alignItems: 'center' },
  glassContainer: {
    width: GLASS_W,
    height: GLASS_H,
    borderRadius: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  seedCenter: { justifyContent: 'center', alignItems: 'center', gap: 12 },
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
