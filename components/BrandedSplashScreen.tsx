import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing,
  useColorScheme, Pressable
} from 'react-native';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── CONSTELLATION PATTERNS (normalized 0→1) ─────────────────
const PATTERNS = [
  { n:'Orion', s:[[.35,.05],[.65,.05],[.50,.20],[.38,.40],[.50,.40],[.62,.40],[.28,.70],[.72,.70]], e:[[0,2],[1,2],[0,3],[1,5],[3,4],[4,5],[3,6],[5,7]] },
  { n:'Ursa Major', s:[[0,.50],[.20,.15],[.45,.10],[.65,.25],[.75,.55],[.60,.80],[.40,.70]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]] },
  { n:'Cassiopeia', s:[[0,.30],[.25,.70],[.50,.20],[.75,.80],[1,.30]], e:[[0,1],[1,2],[2,3],[3,4]] },
  { n:'Cygnus', s:[[.50,0],[.50,.35],[.50,.70],[.20,.35],[.80,.35],[.50,1]], e:[[0,1],[1,2],[2,5],[3,1],[4,1]] },
  { n:'Leo', s:[[.10,.30],[.30,.10],[.50,.15],[.65,.30],[.80,.25],[.70,.50],[.50,.60],[.35,.55]], e:[[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7],[7,0]] },
  { n:'Lyra', s:[[.50,0],[.30,.40],[.70,.40],[.25,.70],[.75,.70]], e:[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4]] },
  { n:'Corona', s:[[.15,.50],[.30,.20],[.50,.10],[.70,.20],[.85,.50],[.75,.75],[.25,.75]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[0,6]] },
  { n:'Scorpius', s:[[.30,0],[.35,.15],[.40,.25],[.45,.40],[.50,.50],[.60,.60],[.70,.65],[.80,.70],[.85,.80],[.80,.90]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]] },
  { n:'Gemini', s:[[.30,0],[.70,0],[.25,.30],[.65,.25],[.20,.60],[.60,.55],[.30,.85],[.70,.80]], e:[[0,2],[2,4],[4,6],[1,3],[3,5],[5,7],[2,3]] },
  { n:'Aquila', s:[[.50,0],[.30,.30],[.70,.30],[.10,.60],[.50,.50],[.90,.60]], e:[[0,1],[0,2],[1,3],[1,4],[2,4],[2,5]] },
];

// ─── LOADING TIPS ─────────────────────────────────────────────
const TIPS = [
  'Calculating the weight of your dreams...',
  'Polishing the stardust...',
  'Whispering to the Llama...',
  'Weaving constellations from your thoughts...',
  'Dusting off the galactic map...',
  'Checking the resonance of your memories...',
  'Inflating the nebula clouds...',
  'Synthesizing pure inspiration...',
  'Herding the stray ideas...',
  'Aligning the stars in your favor...',
  'Brewing neural espresso...',
  'Consulting the digital oracle...',
  'Unfolding the spatial void...',
  'Synchronizing your subconscious...',
  'Polishing the temporal lens...',
  'Gathering fragments of tomorrow...',
  'Navigating the semantic drift...',
  'Waking up the local intelligence...',
  'Painting the void with logic...',
  'Counting the ripples in the memory stream...',
];

// ─── STAR FIELD ───────────────────────────────────────────────
const STARS = Array.from({ length: 120 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: 0.5 + Math.random() * 1.5, o: 0.15 + Math.random() * 0.45,
}));

// ─── LOGO NODES ───────────────────────────────────────────────
const NODES = [
  { x: W * 0.22, y: H * 0.455 },
  { x: W * 0.36, y: H * 0.475 },
  { x: W * 0.50, y: H * 0.455 },
  { x: W * 0.64, y: H * 0.435 },
  { x: W * 0.78, y: H * 0.455 },
];
const R = W * 0.032;

// ─── NATURAL THREAD ───────────────────────────────────────────
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
    const wave1 = Math.sin(t * Math.PI * 3.2 - time * 1.4 + phaseOff) * 22;
    const wave2 = Math.sin(t * Math.PI * 5.7 - time * 0.9 + phaseOff * 0.7) * 8;
    const wave3 = Math.sin(t * Math.PI * 1.1 + time * 0.5 + phaseOff * 1.3) * 12;
    const drift = Math.sin(t * Math.PI * 0.8 + time * 0.3) * 6;
    const edgeFade = Math.sin(t * Math.PI);
    let y = CENTER_Y + (wave1 + wave2 + wave3 + drift) * edgeFade * 0.7;

    if (targetNode) {
      const dx = (x - targetNode.x) / (span * 0.12);
      const pull = Math.exp(-dx * dx);
      y = y + (targetNode.y - y) * pull;
    }
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

// ─── MINI CONSTELLATION (inline SVG icon) ─────────────────────
const MiniConstellation = React.memo(({ patternIdx, size, color }: {
  patternIdx: number; size: number; color: string;
}) => {
  const p = PATTERNS[patternIdx % PATTERNS.length];
  const positions = p.s.map(([sx, sy]: number[]) => ({ x: sx * size, y: sy * size }));
  return (
    <Svg width={size} height={size}>
      {p.e.map(([a, b]: number[], i: number) => (
        <Line key={i} x1={positions[a].x} y1={positions[a].y}
          x2={positions[b].x} y2={positions[b].y} stroke={color} strokeWidth={0.6} opacity={0.5} />
      ))}
      {positions.map((pos, i) => (
        <SvgCircle key={i} cx={pos.x} cy={pos.y} r={1.2} fill={color} opacity={0.8} />
      ))}
    </Svg>
  );
});

export const BrandedSplashScreen = ({ 
  phase, 
  downloadStatus, 
  downloadProgress, 
  downloadSpeed,
  onConsent
}: { 
  phase: 'checking' | 'consent' | 'downloading' | 'loading',
  downloadStatus?: string,
  downloadProgress?: number,
  downloadSpeed?: string,
  onConsent?: () => void
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = {
    bg: isDark ? '#000' : '#FFF',
    text: isDark ? '#E8E6E0' : '#111',
    accent: '#8E44AD'
  };

  const [thread1, setThread1] = useState('');
  const [thread2, setThread2] = useState('');
  const timeRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);
  const pickRandom = () => NODES[1 + Math.floor(Math.random() * 3)];
  const attr1 = useRef({ from: pickRandom(), to: pickRandom(), progress: 1 });
  const attr2 = useRef({ from: pickRandom(), to: pickRandom(), progress: 1 });

  // ── Popup Animation ──
  const popupEntry = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    if (phase === 'consent') {
      Animated.spring(popupEntry, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [phase]);

  const popupY = popupEntry.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 0]
  });

  const popupScale = popupEntry.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.8, 1.05, 1]
  });

  // ── Background constellations ──
  const [constellations, setConstellations] = useState<Array<{
    id: number; patternIdx: number; cx: number; cy: number; scale: number;
  }>>([]);
  const ctrRef = useRef(0);

  // ── Rotating tip + mini constellation ──
  const [tipIdx, setTipIdx] = useState(Math.floor(Math.random() * TIPS.length));
  const [miniConstIdx, setMiniConstIdx] = useState(Math.floor(Math.random() * PATTERNS.length));
  const [barConstIdx, setBarConstIdx] = useState(Math.floor(Math.random() * PATTERNS.length));
  const tipFade = useRef(new Animated.Value(1)).current;

  // Rotate attractor
  useEffect(() => {
    const iv = setInterval(() => {
      attr1.current = { from: attr1.current.to, to: pickRandom(), progress: 0 };
      attr2.current = { from: attr2.current.to, to: pickRandom(), progress: 0 };
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Wave loop
  useEffect(() => {
    const tick = () => {
      timeRef.current += 0.016;
      if (attr1.current.progress < 1) attr1.current.progress = Math.min(1, attr1.current.progress + 0.008);
      if (attr2.current.progress < 1) attr2.current.progress = Math.min(1, attr2.current.progress + 0.008);
      const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;
      const l1 = ease(attr1.current.progress), l2 = ease(attr2.current.progress);
      const t1 = { x: attr1.current.from.x + (attr1.current.to.x - attr1.current.from.x)*l1, y: attr1.current.from.y + (attr1.current.to.y - attr1.current.from.y)*l1 };
      const t2 = { x: attr2.current.from.x + (attr2.current.to.x - attr2.current.from.x)*l2, y: attr2.current.from.y + (attr2.current.to.y - attr2.current.from.y)*l2 };
      setThread1(buildNaturalThread(timeRef.current, 0, t1));
      setThread2(buildNaturalThread(timeRef.current, 2.1, t2));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Constellation spawner
  useEffect(() => {
    const spawn = () => {
      const id = ctrRef.current++;
      const patternIdx = Math.floor(Math.random() * PATTERNS.length);
      const scale = 80 + Math.random() * 100;
      const cx = 60 + Math.random() * (W - 120);
      const cy = 60 + Math.random() * (H - 200);
      setConstellations(prev => {
        const next = [...prev, { id, patternIdx, cx, cy, scale }];
        return next.length > 6 ? next.slice(-6) : next;
      });
    };
    spawn();
    const iv = setInterval(spawn, 4000);
    return () => clearInterval(iv);
  }, []);

  // Rotate tip text
  useEffect(() => {
    if (phase !== 'downloading' && phase !== 'loading') return;
    const iv = setInterval(() => {
      Animated.timing(tipFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setTipIdx(prev => (prev + 1) % TIPS.length);
        setMiniConstIdx(Math.floor(Math.random() * PATTERNS.length));
        Animated.timing(tipFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* BACKGROUND STAR FIELD */}
      {STARS.map((s, i) => (
        <View key={i} style={[styles.star, { left: s.x, top: s.y, width: s.r, height: s.r, borderRadius: s.r/2, opacity: s.o }]} />
      ))}

      {/* FLOAT CONSTELLATIONS */}
      {constellations.map(c => (
        <Animated.View key={c.id} style={{ position: 'absolute', left: c.cx - c.scale/2, top: c.cy - c.scale/2 }}>
          <MiniConstellation patternIdx={c.patternIdx} size={c.scale} color={theme.text} />
        </Animated.View>
      ))}

      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {/* LOGO NODES */}
        {NODES.map((n, i) => (
          <SvgCircle key={i} cx={n.x} cy={n.y} r={R} fill="none" stroke={theme.text} strokeWidth={1} opacity={0.15} />
        ))}
        {/* LOGO DOTS */}
        {NODES.map((n, i) => (
          <SvgCircle key={`d-${i}`} cx={n.x} cy={n.y} r={2} fill={theme.text} opacity={0.4} />
        ))}

        {/* LIQUID THREADS */}
        <Path d={thread1} fill="none" stroke={theme.accent} strokeWidth={0.8} opacity={0.4} />
        <Path d={thread2} fill="none" stroke={theme.accent} strokeWidth={1.2} opacity={0.25} />
      </Svg>

      <View style={styles.header}>
        <Text style={[styles.logoText, { color: theme.text }]}>DRIFT</Text>
        <Text style={styles.logoSubtext}>READING THE STARS</Text>
      </View>

      {/* PHASE: CONSENT POPUP */}
      {phase === 'consent' && (
        <Animated.View style={[styles.popup, { transform: [{ translateY: popupY }, { scale: popupScale }] }]}>
          <View style={styles.popupInner}>
            <View style={{ marginBottom: 20, alignItems: 'center' }}>
              <MiniConstellation patternIdx={barConstIdx} size={100} color={theme.accent} />
            </View>
            <Text style={styles.popupTitle}>Neural Engine Required</Text>
            <Text style={styles.popupDesc}>To perform local synthesis, we need to calibrate your cortex pathways (75MB download).</Text>
            <TouchableOpacity style={styles.consentBtn} onPress={onConsent}>
              <Text style={styles.consentBtnText}>IGNITE ENGINE</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* PHASE: DOWNLOADING / LOADING */}
      {(phase === 'downloading' || phase === 'loading') && (
        <Animated.View style={[styles.footer, { opacity: tipFade }]}>
          <View style={styles.tipHeader}>
            <MiniConstellation patternIdx={miniConstIdx} size={24} color={theme.accent} />
            <Text style={styles.tipLabel}>NEURAL CALIBRATION</Text>
          </View>
          <Text style={styles.tipContent}>{TIPS[tipIdx]}</Text>
          {phase === 'downloading' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${(downloadProgress || 0) * 100}%` }]} />
              <View style={styles.progressTextRow}>
                <Text style={styles.progressMeta}>{downloadStatus}</Text>
                <Text style={styles.progressMeta}>{downloadSpeed}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  star: { position: 'absolute', backgroundColor: '#FFF' },
  header: { position: 'absolute', top: '32%', alignItems: 'center' },
  logoText: { fontSize: 24, letterSpacing: 12, fontWeight: '200', textTransform: 'uppercase' },
  logoSubtext: { fontSize: 9, letterSpacing: 4, color: '#8E44AD', marginTop: 8, fontWeight: '700' },
  popup: { position: 'absolute', width: W * 0.85, zIndex: 100 },
  popupInner: { backgroundColor: 'rgba(20,20,20,0.95)', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 40 },
  popupTitle: { color: '#FFF', fontSize: 20, fontWeight: '300', textAlign: 'center', marginBottom: 12 },
  popupDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  consentBtn: { backgroundColor: '#8E44AD', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  consentBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  footer: { position: 'absolute', bottom: '12%', width: '100%', alignItems: 'center' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  tipLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 2, color: '#8E44AD' },
  tipContent: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', letterSpacing: 1, paddingHorizontal: 40, lineHeight: 18 },
  progressContainer: { width: W * 0.7, marginTop: 24, height: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#8E44AD' },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', width: W * 0.7, marginTop: 8 },
  progressMeta: { color: 'rgba(255,255,255,0.3)', fontSize: 7, fontWeight: '700', letterSpacing: 1 },
});
