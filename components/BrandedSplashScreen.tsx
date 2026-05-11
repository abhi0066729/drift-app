import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing,
  useColorScheme
} from 'react-native';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── CONSTELLATION PATTERNS ─────────────────
const PATTERNS = [
  { n:'Orion', s:[[.35,.05],[.65,.05],[.50,.20],[.38,.40],[.50,.40],[.62,.40],[.28,.70],[.72,.70]], e:[[0,2],[1,2],[0,3],[1,5],[3,4],[4,5],[3,6],[5,7]] },
  { n:'Ursa Major', s:[[0,.50],[.20,.15],[.45,.10],[.65,.25],[.75,.55],[.60,.80],[.40,.70]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]] },
  { n:'Cassiopeia', s:[[0,.30],[.25,.70],[.50,.20],[.75,.80],[1,.30]], e:[[0,1],[1,2],[2,3],[3,4]] },
  { n:'Cygnus', s:[[.50,0],[.50,.35],[.50,.70],[.20,.35],[.80,.35],[.50,1]], e:[[0,1],[1,2],[2,5],[3,1],[4,1]] },
];

const TIPS = [
  'Building Nexus pathways...',
  'Creating constellation maps...',
  'Weaving neural threads...',
  'Synthesizing thought patterns...',
];

const STARS = Array.from({ length: 120 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: 0.5 + Math.random() * 1.5, o: 0.15 + Math.random() * 0.45,
}));

const NODES = [
  { x: W * 0.22, y: H * 0.455 },
  { x: W * 0.36, y: H * 0.475 },
  { x: W * 0.50, y: H * 0.455 },
  { x: W * 0.64, y: H * 0.435 },
  { x: W * 0.78, y: H * 0.455 },
];
const R = W * 0.032;

const CENTER_Y = H * 0.455;
const THREAD_POINTS = 150;

function buildNaturalThread(time: number, phaseOff: number, targetNode: { x: number; y: number } | null): string {
  const parts: string[] = [];
  const startX = NODES[0].x;
  const endX = NODES[NODES.length - 1].x;
  const span = endX - startX;
  for (let i = 0; i <= THREAD_POINTS; i++) {
    const t = i / THREAD_POINTS;
    const x = startX + span * t;
    const wave = Math.sin(t * Math.PI * 3.2 - time * 1.4 + phaseOff) * 22;
    const edgeFade = Math.sin(t * Math.PI);
    let y = CENTER_Y + wave * edgeFade * 0.7;
    if (targetNode) {
      const dx = (x - targetNode.x) / (span * 0.12);
      const pull = Math.exp(-dx * dx);
      y = y + (targetNode.y - y) * pull;
    }
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

const MiniConstellation = React.memo(({ patternIdx, size, color }: any) => {
  const p = PATTERNS[patternIdx % PATTERNS.length];
  const positions = p.s.map(([sx, sy]: number[]) => ({ x: sx * size, y: sy * size }));
  return (
    <Svg width={size} height={size}>
      {p.e.map(([a, b]: number[], i: number) => (
        <Line key={i} x1={positions[a].x} y1={positions[a].y} x2={positions[b].x} y2={positions[b].y} stroke={color} strokeWidth={0.6} opacity={0.5} />
      ))}
      {positions.map((pt: {x: number, y: number}, i: number) => (
        <SvgCircle key={`s${i}`} cx={pt.x} cy={pt.y} r={1.2} fill={color} opacity={0.8} />
      ))}
    </Svg>
  );
});

const ConstellationInstance = React.memo(({ pattern, cx, cy, scale, lineColor, starColor, starOpacity }: any) => {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0.15, duration: 2000, useNativeDriver: true }),
    ]).start();
  }, []);
  const positions = useMemo(() =>
    pattern.s.map(([sx, sy]: number[]) => ({ x: cx + (sx - 0.5) * scale, y: cy + (sy - 0.5) * scale })),
  [pattern, cx, cy, scale]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {pattern.e.map(([a, b]: number[], i: number) => (
          <Line key={`e${i}`} x1={positions[a].x} y1={positions[a].y} x2={positions[b].x} y2={positions[b].y} stroke={lineColor} strokeWidth={0.8} />
        ))}
        {positions.map((p: {x: number, y: number}, i: number) => (
          <SvgCircle key={`s${i}`} cx={p.x} cy={p.y} r={2} fill={starColor} opacity={starOpacity} />
        ))}
      </Svg>
    </Animated.View>
  );
});

interface SplashProps {
  phase: 'checking' | 'consent' | 'downloading' | 'loading';
  status?: string;
  progress?: number;
  speed?: string;
  onConsent?: () => void;
}

export const BrandedSplashScreen = ({ phase, status, progress = 0, speed, onConsent }: SplashProps) => {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const C = {
    bg: dark ? '#000' : '#F2F2F2',
    fg: dark ? '#fff' : '#000',
    cardBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    cardBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    accent: '#F1C40F',
  };

  const [thread1, setThread1] = useState('');
  const timeRef = useRef(0);
  const popupEntry = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tick = () => {
      timeRef.current += 0.016;
      setThread1(buildNaturalThread(timeRef.current, 0, null));
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase === 'consent') {
      Animated.spring(popupEntry, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [phase]);

  const popupY = popupEntry.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0]
  });

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* ── STAR FIELD ── */}
      {STARS.map((s, i) => (
        <View key={i} style={{ position:'absolute', left:s.x, top:s.y, width:s.r*2, height:s.r*2, borderRadius:s.r, backgroundColor:C.fg, opacity:s.o }} />
      ))}

      {/* ── LOGO ── */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={thread1} stroke={C.fg} strokeWidth={1.5} fill="none" opacity={0.3} />
        {NODES.map((n, i) => (
          <SvgCircle key={i} cx={n.x} cy={n.y} r={R} fill={C.fg} />
        ))}
      </Svg>

      <View style={styles.overlayContainer}>
        {phase === 'consent' && (
          <Animated.View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.cardBorder, opacity: popupEntry, transform: [{ translateY: popupY }] }]}>
            <Text style={[styles.cardTitle, { color: C.fg }]}>AWAKEN THE PALACE</Text>
            <Text style={[styles.cardBody, { color: C.fg, opacity: 0.5 }]}>
              Sync with the neural grid to enable deep intelligence.
            </Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.fg }]} onPress={onConsent}>
              <Text style={[styles.btnText, { color: C.bg }]}>INITIALIZE DOWNLOAD</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === 'downloading' && (
          <View style={styles.dashboard}>
            <Text style={[styles.status, { color: C.fg }]}>{status?.toUpperCase()}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: C.accent }]} />
            </View>
            <Text style={[styles.pct, { color: C.fg }]}>{Math.round(progress * 100)}%</Text>
          </View>
        )}
        
        {phase === 'checking' && (
          <Text style={[styles.checking, { color: C.fg, opacity: 0.4 }]}>READING THE STARS...</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlayContainer: { position:'absolute', bottom:100, width:'100%', paddingHorizontal:30, alignItems:'center' },
  card: { width:'100%', padding:30, borderRadius:30, borderWidth:1 },
  cardTitle: { fontSize:16, fontWeight:'900', letterSpacing:3, marginBottom:10 },
  cardBody: { fontSize:13, lineHeight:20, marginBottom:30 },
  btn: { paddingVertical:18, borderRadius:20, alignItems:'center' },
  btnText: { fontWeight:'900', letterSpacing:2, fontSize:12 },
  dashboard: { width:'100%' },
  status: { fontSize:10, fontWeight:'800', marginBottom:15, letterSpacing:2 },
  track: { height:2, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:1, overflow:'hidden' },
  fill: { height:'100%' },
  pct: { fontSize:12, fontWeight:'900', marginTop:10, textAlign:'right' },
  checking: { fontSize:10, fontWeight:'800', letterSpacing:2 },
});
