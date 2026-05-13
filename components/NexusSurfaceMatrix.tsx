/**
 * NexusSurfaceMatrix.tsx
 *
 * THE GALACTIC SYNTHESIS FIELD:
 * - Immersive obsidian void.
 * - Nebula Dust layer: Faint background star clouds for every galaxy.
 * - Luminous Constellation bonds weaving through the galaxies.
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Star } from 'lucide-react-native';

import { useNotesStore } from '@/store/useNotesStore';
import { computeConstellations, NexusNode } from '@/utils/nexusEngine';
import { NightTheme } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/Categories';


const { width, height } = Dimensions.get('window');

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

const StellarDot = React.memo(({
  node,
  onTap,
  theme,
}: {
  node: NexusNode;
  onTap: (n: NexusNode, sx: number, sy: number) => void;
  theme: string;
}) => {
  const tap = Gesture.Tap().onEnd((e) => {
    'worklet';
    runOnJS(onTap)(node, e.absoluteX, e.absoluteY);
  });
  const hitSize = 36;
  return (
    <GestureDetector gesture={tap}>
      <View
        style={{
          position: 'absolute',
          left: node.x - hitSize / 2,
          top: node.y - hitSize / 2,
          width: hitSize,
          height: hitSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: node.radius * 2,
            height: node.radius * 2,
            borderRadius: node.radius,
            backgroundColor: theme === 'dark' ? '#ffffff' : '#111111',
            opacity: node.opacity,
          }}
        />
        {node.pipeline_step && node.pipeline_step !== 'complete' && (
          <View style={{
            position: 'absolute',
            width: node.radius * 3.5,
            height: node.radius * 3.5,
            borderRadius: node.radius * 1.75,
            borderWidth: 1,
            borderColor: 
              node.pipeline_step === 'embedding' ? '#FF9F43' : 
              (node.pipeline_step === 'vectorizing' ? '#3498DB' : 
              (node.pipeline_step === 'synthesizing' ? '#8E44AD' : '#E74C3C')),
            borderStyle: 'dashed',
            opacity: 0.6
          }} />
        )}
      </View>
    </GestureDetector>
  );
});

// ─── Galactic Dust (Background Stars) ─────────────────────────────────────────
const GalacticDust = React.memo(({ node, theme }: { node: NexusNode; theme: string }) => (
  <View
    style={{
      position: 'absolute',
      left: node.x - node.radius,
      top: node.y - node.radius,
      width: node.radius * 2,
      height: node.radius * 2,
      borderRadius: node.radius,
      backgroundColor: theme === 'dark' ? '#ffffff' : '#111111',
      opacity: node.opacity,
    }}
  />
));

const QuickViewCard = React.memo(({ node, pos, onClose, theme }: {
  node: NexusNode;
  pos: { x: number, y: number };
  onClose: () => void;
  theme: string;
}) => {
  const cardW = 300;
  const cardH = 240;
  
  // Adaptive positioning: Try to stay above, fallback to below
  const topPos = pos.y - cardH - 30 > 100 ? pos.y - cardH - 30 : pos.y + 30;
  const leftPos = Math.max(20, Math.min(width - cardW - 20, pos.x - cardW / 2));

  const dateStr = node.created_at 
    ? new Date(node.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown Date';

  const accentColor = CATEGORY_COLORS[node.category || 'Journal'] || '#8E44AD';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.quickViewWrapper, { top: topPos, left: leftPos }]}
    >
      <BlurView intensity={90} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[styles.quickViewBorder, { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
      
      <Pressable onPress={onClose} style={styles.quickViewInner}>
        <View style={styles.quickViewHeader}>
          <View style={[styles.categoryPill, { backgroundColor: `${accentColor}20` }]}>
            <View style={[styles.pillDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.pillText, { color: accentColor }]}>{(node.category || 'Note').toUpperCase()}</Text>
          </View>
          <Text style={[styles.quickViewDate, { color: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>{dateStr}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.quickViewScroll}>
          <Text style={[styles.quickViewContent, { color: theme === 'dark' ? '#FFFFFF' : '#111111' }]}>
            {node.content}
          </Text>
        </ScrollView>

        {node.emotion && (
          <View style={styles.quickViewFooter}>
            <Text style={[styles.emotionLabel, { color: accentColor }]}>✧ {node.emotion.toUpperCase()}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

interface NexusSurfaceMatrixProps {
  notes: any[];
  theme: 'light' | 'dark';
  onPress: (node: any, type: 'dot' | 'text') => void;
}

export default function NexusSurfaceMatrix({ notes, theme, onPress }: NexusSurfaceMatrixProps) {
  const [quickViewNode, setQuickViewNode] = useState<NexusNode | null>(null);
  const [quickViewPos, setQuickViewPos] = useState({ x: 0, y: 0 });
  const addNote = useNotesStore(state => state.addNote);


  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const sc = useSharedValue(0.4);
  const savedSc = useSharedValue(0.4);

  // Vibration pulse for over-energized constellations (0 → 1 → 0 loop)
  const vibrationPulse = useSharedValue(0);
  useEffect(() => {
    vibrationPulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const layout = useMemo(() => computeConstellations(notes), [notes]);

  useEffect(() => {
    if (layout.nodes.length === 0) return;

    const { minX, maxX, minY, maxY } = layout.bounds;
    const structW = Math.max(width, maxX - minX);
    const structH = Math.max(height, maxY - minY);

    const targetSc = Math.max(0.2, Math.min(
      (width * 0.9) / structW,
      (height * 0.9) / structH,
      1.1
    ));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const targetTx = -(centerX - width / 2) * targetSc;
    const targetTy = -(centerY - height / 2) * targetSc;

    const config = { damping: 25, stiffness: 100 };
    tx.value = withSpring(targetTx, config);
    ty.value = withSpring(targetTy, config);
    sc.value = withSpring(targetSc, config);

    savedTx.value = targetTx;
    savedTy.value = targetTy;
    savedSc.value = targetSc;
  }, [layout.bounds]);

  const handleTap = useCallback((node: NexusNode, absoluteX: number, absoluteY: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setQuickViewNode(node);
    setQuickViewPos({ x: absoluteX, y: absoluteY });
  }, []);


  const seed100Thoughts = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const coreDomains = [
      { topic: "Reflecting on the subtle shift in my morning energy and focus today.", category: "Journal" },
      { topic: "What if we could visualize semantic relationships as a liquid gravitational field?", category: "Idea" },
      { topic: "Deeply considering the implications of digital minimalism on long-term creativity.", category: "Reflection" },
      { topic: "Analysing the historical transition from linear to non-linear narrative structures.", category: "Study" },
      { topic: "I dreamt of a giant mechanical clock floating in a void of silver dust.", category: "Dream" },
      { topic: "A sudden spark of inspiration for a new spatial interface for thought archival.", category: "Idea" },
      { topic: "Tracing the emotional resonance of forgotten childhood memories in a quiet room.", category: "Journal" },
      { topic: "Synthesis of multiple research papers regarding the evolution of neural networks.", category: "Study" },
      { topic: "Questioning the boundaries between human intuition and algorithmic synthesis.", category: "Reflection" },
    ];

    for (let i = 0; i < 100; i++) {
      const domain = coreDomains[i % coreDomains.length];
      const uniqueSuffix = Math.random().toString(36).substring(7);
      addNote({
        id: `seed-${Date.now()}-${i}-${uniqueSuffix}`,
        content: `${domain.topic} [Ref: ${uniqueSuffix}]`,
        created_at: Date.now() - (Math.random() * 1000 * 60 * 60 * 24 * 30),
        source_type: 'text',
        entities_json: JSON.stringify({ category: domain.category }),
      });
    }
  }, [addNote]);

  const clearAllNotes = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    useNotesStore.setState({ notes: [] });
  }, []);

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate(e => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
      if (quickViewNode) runOnJS(setQuickViewNode)(null);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => { savedSc.value = sc.value; })
    .onUpdate(e => {
      sc.value = Math.max(0.1, Math.min(5.0, savedSc.value * e.scale));
      if (quickViewNode) runOnJS(setQuickViewNode)(null);
    });

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    'worklet';
    runOnJS(seed100Thoughts)();
  });

  const tripleTap = Gesture.Tap().numberOfTaps(3).onEnd(() => {
    'worklet';
    runOnJS(clearAllNotes)();
  });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const nodeContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
    ],
  }));

  const nodeMap = useMemo(() => {
    const m = new Map<string, NexusNode>();
    layout.nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [layout.nodes]);

  return (
    <View style={styles.root}>
      <View style={[styles.root, { backgroundColor: theme === 'dark' ? '#000000' : '#FFFFFF' }]}>
        <GestureDetector gesture={gesture}>
          <View style={styles.root}>

            {layout.nodes.length === 0 && (
              <Animated.View entering={FadeIn.delay(300)} style={[styles.emptyState, { marginTop: -80 }]}>
                <BlinkingStar />
                <Text style={[styles.emptyTextTitle, { color: theme === 'dark' ? '#E8E6E0' : '#111111' }]}>The Void is Empty</Text>
                <Text style={styles.emptyTextSub}>Synthesize new thoughts to form constellations.</Text>
              </Animated.View>
            )}

            <Animated.View style={[styles.root, nodeContainerStyle]} entering={FadeIn.duration(800)}>

              {/* Layer 1: Galactic Dust (Nebula background) */}
              {layout.dust.map(d => (
                <GalacticDust key={d.id} node={d} theme={theme} />
              ))}

              {/* Layer 2: Constellation Bonds */}
              {layout.nodes.length > 0 && (() => {
                const pad = 50;
                const svgLeft = layout.bounds.minX - pad;
                const svgTop = layout.bounds.minY - pad;
                const svgW = layout.bounds.maxX - layout.bounds.minX + pad * 2;
                const svgH = layout.bounds.maxY - layout.bounds.minY + pad * 2;
                return (
                  <Svg 
                    width={svgW}
                    height={svgH}
                    style={{ position: 'absolute', left: svgLeft, top: svgTop }}
                    pointerEvents="none"
                  >
                    {layout.bonds.map(bond => {
                      const src = nodeMap.get(bond.sourceId);
                      const tgt = nodeMap.get(bond.targetId);
                      if (!src || !tgt) return null;

                      const x1 = src.x - svgLeft;
                      const y1 = src.y - svgTop;
                      const x2 = tgt.x - svgLeft;
                      const y2 = tgt.y - svgTop;
                      const mx = (x1 + x2) / 2;
                      const my = (y1 + y2) / 2;
                      const isAnchor = bond.isAnchorBond;
                      const strokeW = isAnchor ? 1.8 : 1.0;

                      const baseOpacity = isAnchor
                        ? Math.min(1.0, bond.opacity * 2.0)
                        : Math.min(0.8, bond.opacity * 1.5);
                      
                      const strokeOpacity = bond.isVibrating
                        ? baseOpacity * (0.3 + 0.7 * vibrationPulse.value)
                        : baseOpacity;
                      
                      const finalStrokeW = bond.isVibrating ? strokeW * 1.5 : strokeW;

                      return (
                        <React.Fragment key={bond.id}>
                          <Line
                            x1={x1} y1={y1}
                            x2={x2} y2={y2}
                            stroke={bond.isVibrating ? '#ffcc44' : (theme === 'dark' ? '#ffffff' : '#111111')}
                            strokeWidth={finalStrokeW}
                            opacity={strokeOpacity}
                            strokeLinecap="round"
                          />
                          <Circle
                            cx={mx} cy={my}
                            r={isAnchor ? 1.5 : 0.9}
                            fill={bond.isVibrating ? '#ffcc44' : (theme === 'dark' ? '#ffffff' : '#111111')}
                            opacity={strokeOpacity * 0.8}
                          />
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                );
              })()}

              {/* Layer 3: Major Stellar Nodes (Notes) */}
              {layout.nodes.map(node => (
                <StellarDot
                  key={node.id}
                  node={node}
                  onTap={handleTap}
                  theme={theme}
                />
              ))}
            </Animated.View>

            {/* Statistics Footer */}
            <View style={styles.footer} pointerEvents="none">
              <Text style={[styles.footerText, { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)' }]}>
                {layout.nodes.length} STELLAR NODES • {layout.bonds.length} CONSTELLATION BINDINGS
              </Text>
            </View>
          </View>
        </GestureDetector>
      </View>

      {quickViewNode && (
        <QuickViewCard 
          node={quickViewNode} 
          pos={quickViewPos} 
          onClose={() => setQuickViewNode(null)} 
          theme={theme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emptyState: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  emptyTextTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#E8E6E0',
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
  quickViewWrapper: {
    position: 'absolute',
    width: 300,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10000,
  },
  quickViewBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  quickViewInner: {
    padding: 20,
    minHeight: 180,
  },
  quickViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  quickViewDate: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  quickViewScroll: {
    maxHeight: 140,
  },
  quickViewContent: {
    fontSize: 16,
    fontWeight: '300',
    lineHeight: 24,
  },
  quickViewFooter: {
    marginTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(124, 58, 237, 0.2)',
    paddingTop: 12,
  },
  emotionLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
  expandCard: { /* Decommissioned */ },
});
