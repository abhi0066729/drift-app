import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, Easing,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── REAL CONSTELLATION PATTERNS (normalized 0→1) ─────────────
const PATTERNS = [
  { // Orion
    s: [[.35,.05],[.65,.05],[.50,.20],[.38,.40],[.50,.40],[.62,.40],[.28,.70],[.72,.70]],
    e: [[0,2],[1,2],[0,3],[1,5],[3,4],[4,5],[3,6],[5,7]],
  },
  { // Big Dipper
    s: [[0,.50],[.20,.15],[.45,.10],[.65,.25],[.75,.55],[.60,.80],[.40,.70]],
    e: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]],
  },
  { // Cassiopeia
    s: [[0,.30],[.25,.70],[.50,.20],[.75,.80],[1,.30]],
    e: [[0,1],[1,2],[2,3],[3,4]],
  },
  { // Cygnus
    s: [[.50,0],[.50,.35],[.50,.70],[.20,.35],[.80,.35],[.50,1]],
    e: [[0,1],[1,2],[2,5],[3,1],[4,1]],
  },
  { // Leo
    s: [[.10,.30],[.30,.10],[.50,.15],[.65,.30],[.80,.25],[.70,.50],[.50,.60],[.35,.55]],
    e: [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7],[7,0]],
  },
  { // Lyra
    s: [[.50,0],[.30,.40],[.70,.40],[.25,.70],[.75,.70]],
    e: [[0,1],[0,2],[1,2],[1,3],[2,4],[3,4]],
  },
  { // Corona Borealis
    s: [[.15,.50],[.30,.20],[.50,.10],[.70,.20],[.85,.50],[.75,.75],[.25,.75]],
    e: [[0,1],[1,2],[2,3],[3,4],[4,5],[0,6]],
  },
  { // Scorpius
    s: [[.30,0],[.35,.15],[.40,.25],[.45,.40],[.50,.50],[.60,.60],[.70,.65],[.80,.70],[.85,.80],[.80,.90]],
    e: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]],
  },
  { // Gemini
    s: [[.30,0],[.70,0],[.25,.30],[.65,.25],[.20,.60],[.60,.55],[.30,.85],[.70,.80]],
    e: [[0,2],[2,4],[4,6],[1,3],[3,5],[5,7],[2,3]],
  },
  { // Aquila
    s: [[.50,0],[.30,.30],[.70,.30],[.10,.60],[.50,.50],[.90,.60]],
    e: [[0,1],[0,2],[1,3],[1,4],[2,4],[2,5]],
  },
];

// ─── STATIC STAR FIELD ────────────────────────────────────────
const STARS = Array.from({ length: 120 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 0.5 + Math.random() * 1.5,
  o: 0.15 + Math.random() * 0.45,
}));

// ─── LOGO NODES ───────────────────────────────────────────────
const NODES = [
  { x: W * 0.25, y: H * 0.44 },     // 1
  { x: W * 0.37, y: H * 0.475 },    // 2 (lower)
  { x: W * 0.50, y: H * 0.44 },     // 3
  { x: W * 0.63, y: H * 0.415 },    // 4 (higher) – threads pass here
  { x: W * 0.75, y: H * 0.44 },     // 5
];

// ─── SUB-COMPONENTS ───────────────────────────────────────────

/** A single constellation that fades in, holds, then dims */
const ConstellationInstance = React.memo(({ pattern, cx, cy, scale }: {
  pattern: typeof PATTERNS[0]; cx: number; cy: number; scale: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(fadeAnim, { toValue: 0.12, duration: 2000, useNativeDriver: true }),
    ]).start();
  }, []);

  const starPositions = useMemo(() =>
    pattern.s.map(([sx, sy]) => ({
      x: cx + (sx - 0.5) * scale,
      y: cy + (sy - 0.5) * scale,
    })), [pattern, cx, cy, scale]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {pattern.e.map(([a, b], i) => (
          <Line key={`e${i}`}
            x1={starPositions[a].x} y1={starPositions[a].y}
            x2={starPositions[b].x} y2={starPositions[b].y}
            stroke="rgba(255,255,255,0.3)" strokeWidth={0.8}
          />
        ))}
        {starPositions.map((p, i) => (
          <Circle key={`s${i}`} cx={p.x} cy={p.y} r={2} fill="white" opacity={0.9} />
        ))}
      </Svg>
    </Animated.View>
  );
});

/** Twinkling stars in the background */
const TwinkleStar = React.memo(({ x, y, r, delay }: { x: number; y: number; r: number; delay: number }) => {
  const anim = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 0.8, duration: 1500 + Math.random() * 1500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.15, duration: 1500 + Math.random() * 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y, width: r * 2, height: r * 2,
      borderRadius: r, backgroundColor: '#fff', opacity: anim,
    }} />
  );
});

/** Two flowing pulse dots along the logo thread path */
const ThreadPulse = ({ nodes, delay }: { nodes: typeof NODES; delay: number }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Interpolate x/y across 5 nodes
  const stops = nodes.map((_, i) => i / (nodes.length - 1));
  const translateX = progress.interpolate({
    inputRange: stops,
    outputRange: nodes.map(n => n.x - 4),
  });
  const translateY = progress.interpolate({
    inputRange: stops,
    outputRange: nodes.map(n => n.y - 4),
  });

  return (
    <>
      {/* Glow */}
      <Animated.View style={{
        position: 'absolute', width: 16, height: 16, borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        transform: [{ translateX: Animated.subtract(translateX, 4) }, { translateY: Animated.subtract(translateY, 4) }],
      }} />
      {/* Core dot */}
      <Animated.View style={{
        position: 'absolute', width: 8, height: 8, borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.7)',
        transform: [{ translateX }, { translateY }],
      }} />
    </>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────

interface SplashProps {
  status?: string;
  progress?: number;
  speed?: string;
  onConsent?: () => void;
  needsConsent?: boolean;
}

export const BrandedSplashScreen = ({ status, progress = 0, speed, onConsent, needsConsent }: SplashProps) => {
  const [constellations, setConstellations] = useState<Array<{
    id: number; patternIdx: number; cx: number; cy: number; scale: number;
  }>>([]);
  const counterRef = useRef(0);

  // Spawn constellations periodically
  useEffect(() => {
    const spawn = () => {
      const patternIdx = Math.floor(Math.random() * PATTERNS.length);
      const scale = 80 + Math.random() * 100;
      const cx = 60 + Math.random() * (W - 120);
      const cy = 60 + Math.random() * (H - 200);
      const id = counterRef.current++;
      setConstellations(prev => {
        const next = [...prev, { id, patternIdx, cx, cy, scale }];
        return next.length > 6 ? next.slice(-6) : next;
      });
    };

    spawn(); // First one immediately
    const interval = setInterval(spawn, 4000);
    return () => clearInterval(interval);
  }, []);

  // Pre-select twinkling stars (30% of the field)
  const twinklers = useMemo(() =>
    STARS.filter(() => Math.random() > 0.7).map((s, i) => ({ ...s, delay: i * 300 })),
  []);

  return (
    <View style={styles.container}>
      {/* ── STAR FIELD ── */}
      {STARS.map((s, i) => (
        <View key={i} style={{
          position: 'absolute', left: s.x, top: s.y,
          width: s.r * 2, height: s.r * 2, borderRadius: s.r,
          backgroundColor: '#fff', opacity: s.o,
        }} />
      ))}

      {/* ── TWINKLING STARS ── */}
      {twinklers.map((s, i) => (
        <TwinkleStar key={`tw${i}`} x={s.x} y={s.y} r={s.r} delay={s.delay} />
      ))}

      {/* ── CONSTELLATIONS ── */}
      {constellations.map(c => (
        <ConstellationInstance
          key={c.id}
          pattern={PATTERNS[c.patternIdx]}
          cx={c.cx} cy={c.cy} scale={c.scale}
        />
      ))}

      {/* ── LOGO ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Thread lines between nodes */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          {NODES.slice(0, -1).map((n, i) => (
            <Line key={`ln${i}`}
              x1={n.x} y1={n.y}
              x2={NODES[i + 1].x} y2={NODES[i + 1].y}
              stroke="rgba(255,255,255,0.12)" strokeWidth={1}
            />
          ))}
        </Svg>

        {/* Flowing pulse dots (two threads, offset) */}
        <ThreadPulse nodes={NODES} delay={0} />
        <ThreadPulse nodes={NODES} delay={1500} />

        {/* Node circles */}
        {NODES.map((n, i) => (
          <View key={`nd${i}`} style={[styles.node, {
            left: n.x - 8, top: n.y - 8,
            width: i === 3 ? 20 : 16, height: i === 3 ? 20 : 16,
            borderRadius: i === 3 ? 10 : 8,
          }]} />
        ))}

        {/* DRIFT text */}
        <View style={styles.textAnchor}>
          <Text style={styles.driftText}>D R I F T</Text>
        </View>
      </View>

      {/* ── OVERLAY ── */}
      <View style={styles.overlayContainer}>
        {needsConsent ? (
          <View style={styles.card}>
            <Text style={styles.modalTitle}>AWAKEN THE PALACE</Text>
            <Text style={styles.modalBody}>
              To enable offline intelligence, Drift needs to synchronize its neural grid (~600MB).
            </Text>
            <TouchableOpacity style={styles.actionButton} onPress={onConsent} activeOpacity={0.7}>
              <Text style={styles.actionButtonText}>INITIALIZE SYNC</Text>
            </TouchableOpacity>
          </View>
        ) : status ? (
          <View style={styles.dashboard}>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>{status.toUpperCase()}</Text>
              {speed && <Text style={styles.speedLabel}>{speed}</Text>}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.pctText}>{Math.round(progress * 100)}% COMPLETE</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ─── STYLES ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  node: {
    position: 'absolute', backgroundColor: '#fff', zIndex: 20,
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8,
  },
  textAnchor: {
    position: 'absolute', top: NODES[2].y + 45, width: W, alignItems: 'center',
  },
  driftText: {
    fontSize: 13, fontWeight: '300', color: '#fff',
    letterSpacing: 14, opacity: 0.7,
  },

  overlayContainer: {
    position: 'absolute', bottom: 90, width: '100%',
    alignItems: 'center', paddingHorizontal: 28, zIndex: 1000,
  },
  card: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 28, borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 12, fontWeight: '900', color: '#fff',
    marginBottom: 12, letterSpacing: 3,
  },
  modalBody: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 22, marginBottom: 24 },
  actionButton: {
    backgroundColor: '#fff', paddingVertical: 16, borderRadius: 20, alignItems: 'center',
  },
  actionButtonText: { color: '#000', fontWeight: '900', letterSpacing: 1.5, fontSize: 12 },

  dashboard: { width: '100%', alignItems: 'center' },
  telemetryRow: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10,
  },
  telemetryLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  speedLabel: { fontSize: 10, fontWeight: '900', color: '#fff' },
  progressTrack: {
    width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#F1C40F' },
  pctText: {
    marginTop: 14, fontSize: 10, fontWeight: '900',
    color: 'rgba(255,255,255,0.3)', letterSpacing: 2,
  },
});
