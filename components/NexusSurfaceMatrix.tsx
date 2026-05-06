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
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Circle } from 'react-native-svg';

import ReadingModal from '@/components/ReadingModal';
import { useNotesStore } from '@/store/useNotesStore';
import { computeConstellations, NexusNode } from '@/utils/nexusEngine';

const { width, height } = Dimensions.get('window');

// ─── Major Stellar Node ──────────────────────────────────────────────────────
const StellarDot = React.memo(({
  node,
  onTap,
}: {
  node: NexusNode;
  onTap: (n: NexusNode) => void;
}) => {
  const tap = Gesture.Tap().onEnd(() => {
    'worklet';
    runOnJS(onTap)(node);
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
            backgroundColor: '#ffffff',
            opacity: node.opacity,
          }}
        />
      </View>
    </GestureDetector>
  );
});

// ─── Galactic Dust (Background Stars) ─────────────────────────────────────────
const GalacticDust = React.memo(({ node }: { node: NexusNode }) => (
  <View
    style={{
      position: 'absolute',
      left: node.x - node.radius,
      top: node.y - node.radius,
      width: node.radius * 2,
      height: node.radius * 2,
      borderRadius: node.radius,
      backgroundColor: '#ffffff',
      opacity: node.opacity,
    }}
  />
));

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NexusSurfaceMatrix() {
  const notes = useNotesStore(state => state.notes);
  const addNote = useNotesStore(state => state.addNote);
  const [readingNode, setReadingNode] = useState<NexusNode | null>(null);

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

  const handleTap = useCallback((node: NexusNode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    setReadingNode(node);
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
    // This is a temporary test helper to clear the Nexus field
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
    });

  const pinch = Gesture.Pinch()
    .onStart(() => { savedSc.value = sc.value; })
    .onUpdate(e => {
      sc.value = Math.max(0.1, Math.min(5.0, savedSc.value * e.scale));
    });

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    'worklet';
    runOnJS(seed100Thoughts)();
  });

  const tripleTap = Gesture.Tap().numberOfTaps(3).onEnd(() => {
    'worklet';
    runOnJS(clearAllNotes)();
  });

  const gesture = Gesture.Exclusive(tripleTap, doubleTap, Gesture.Simultaneous(pan, pinch));

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
    <GestureHandlerRootView style={styles.root}>
      <View style={[styles.root, { backgroundColor: '#000000' }]}>
        <GestureDetector gesture={gesture}>
          <View style={styles.root}>
            <Animated.View style={[styles.root, nodeContainerStyle]} entering={FadeIn.duration(800)}>

              {/* Layer 1: Galactic Dust (Nebula background) */}
              {layout.dust.map(d => (
                <GalacticDust key={d.id} node={d} />
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
                      const strokeW = isAnchor ? 1.0 : 0.6;

                      // Vibrating bonds pulse their opacity
                      const baseOpacity = isAnchor
                        ? Math.min(0.8, bond.opacity * 1.6)
                        : Math.min(0.5, bond.opacity * 1.2);
                      // isVibrating: modulate between 30% and 100% of base opacity
                      const strokeOpacity = bond.isVibrating
                        ? baseOpacity * (0.3 + 0.7 * vibrationPulse.value)
                        : baseOpacity;
                      // Vibrating bonds are slightly thicker to suggest tension
                      const finalStrokeW = bond.isVibrating ? strokeW * 1.5 : strokeW;

                      return (
                        <React.Fragment key={bond.id}>
                          <Line
                            x1={x1} y1={y1}
                            x2={x2} y2={y2}
                            stroke={bond.isVibrating ? '#ffcc44' : '#ffffff'}
                            strokeWidth={finalStrokeW}
                            opacity={strokeOpacity}
                            strokeLinecap="round"
                          />
                          <Circle
                            cx={mx} cy={my}
                            r={isAnchor ? 1.5 : 0.9}
                            fill={bond.isVibrating ? '#ffcc44' : '#ffffff'}
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
                />
              ))}
            </Animated.View>

            {/* Statistics Footer */}
            <View style={styles.footer} pointerEvents="none">
              <Text style={styles.footerText}>
                {layout.nodes.length} STELLAR NODES • {layout.bonds.length} CONSTELLATION BINDINGS
              </Text>
            </View>
          </View>
        </GestureDetector>
      </View>

      {readingNode && (
        <ReadingModal
          node={readingNode}
          onClose={() => setReadingNode(null)}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  svgLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
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
});
