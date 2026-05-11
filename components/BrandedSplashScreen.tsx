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
      {positions.map((pt: {x: number, y: number}, i: number) => (
        <SvgCircle key={`s${i}`} cx={pt.x} cy={pt.y} r={1.2} fill={color} opacity={0.8} />
      ))}
    </Svg>
  );
});

// ─── BACKGROUND CONSTELLATION ─────────────────────────────────
const ConstellationInstance = React.memo(({ pattern, cx, cy, scale, lineColor, starColor, starOpacity }: {
  pattern: typeof PATTERNS[0]; cx: number; cy: number; scale: number;
  lineColor: string; starColor: string; starOpacity: number;
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(fade, { toValue: 0.12, duration: 2000, useNativeDriver: true }),
    ]).start();
  }, []);

  const positions = useMemo(() =>
    pattern.s.map(([sx, sy]: number[]) => ({ x: cx + (sx - 0.5) * scale, y: cy + (sy - 0.5) * scale })),
  [pattern, cx, cy, scale]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {pattern.e.map(([a, b]: number[], i: number) => (
          <Line key={`e${i}`} x1={positions[a].x} y1={positions[a].y}
            x2={positions[b].x} y2={positions[b].y} stroke={lineColor} strokeWidth={0.8} />
        ))}
        {positions.map((p: {x: number, y: number}, i: number) => (
          <SvgCircle key={`s${i}`} cx={p.x} cy={p.y} r={2} fill={starColor} opacity={starOpacity} />
        ))}
      </Svg>
    </Animated.View>
  );
});

// ─── TWINKLING STAR ───────────────────────────────────────────
const TwinkleStar = React.memo(({ x, y, r, delay, color }: { x: number; y: number; r: number; delay: number; color: string }) => {
  const a = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(a, { toValue: 0.8, duration: 1800, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.15, duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ position:'absolute', left:x, top:y, width:r*2, height:r*2, borderRadius:r, backgroundColor:color, opacity:a }} />;
});

// ─── PROPS ────────────────────────────────────────────────────
interface SplashProps {
  phase: 'checking' | 'consent' | 'downloading' | 'loading';
  status?: string;
  progress?: number;
  speed?: string;
  onConsent?: () => void;
}

// ─── MAIN ─────────────────────────────────────────────────────
export const BrandedSplashScreen = ({ phase, status, progress = 0, speed, onConsent }: SplashProps) => {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  // Dynamic color palette (light mode ~10% brighter stars/constellations)
  const C = useMemo(() => ({
    bg: dark ? '#000' : '#F2F2F2',
    fg: dark ? '#fff' : '#000',
    threadColor: dark ? '#fff' : '#000',
    threadOpacity: dark ? 0.35 : 0.25,
    starColor: dark ? '#fff' : '#000',
    starOpacity: dark ? 1 : 0.35,          // boosted from 0.25
    constLine: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.18)',  // boosted from 0.12
    constStar: dark ? 'white' : 'black',
    constStarOpacity: dark ? 0.9 : 0.6,    // boosted from 0.5
    textOpacity: dark ? 0.7 : 0.85,
    cardBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    cardBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    cardTitle: dark ? '#fff' : '#000',
    cardBody: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
    btnBg: dark ? '#fff' : '#000',
    btnText: dark ? '#000' : '#fff',
    telemetry: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
    speedColor: dark ? '#fff' : '#333',
    trackBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    pctColor: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
    tipColor: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)',
    miniConst: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)',
  }), [dark]);

  // ── Wave animation state ──
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
      // PREMIUM LIQUID SPRING
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
    outputRange: [-400, 0] // Drop from 400px up
  });

  const popupScale = popupEntry.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.8, 1.05, 1] // Slight overshoot scale
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

  // Rotate attractor every 5s
  useEffect(() => {
    const iv = setInterval(() => {
      attr1.current = { from: attr1.current.to, to: pickRandom(), progress: 0 };
      attr2.current = { from: attr2.current.to, to: pickRandom(), progress: 0 };
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Wave animation loop
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

  // Rotate tip text every 3s with fade
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

  // Rotate bar constellation icon every 2s
  useEffect(() => {
    if (phase !== 'downloading') return;
    const iv = setInterval(() => {
      setBarConstIdx(Math.floor(Math.random() * PATTERNS.length));
    }, 2000);
    return () => clearInterval(iv);
  }, [phase]);

  const twinklers = useMemo(() =>
    STARS.filter(() => Math.random() > 0.7).map((s, i) => ({ ...s, delay: i * 300 })),
  []);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* ── STAR FIELD ── */}
      {STARS.map((s, i) => (
        <View key={i} style={{ position:'absolute', left:s.x, top:s.y, width:s.r*2, height:s.r*2, borderRadius:s.r, backgroundColor:C.starColor, opacity:s.o * C.starOpacity }} />
      ))}
      {twinklers.map((s, i) => <TwinkleStar key={`tw${i}`} x={s.x} y={s.y} r={s.r} delay={s.delay} color={C.starColor} />)}

      {/* ── CONSTELLATIONS ── */}
      {constellations.map(c => (
        <ConstellationInstance key={c.id} pattern={PATTERNS[c.patternIdx]} cx={c.cx} cy={c.cy} scale={c.scale}
          lineColor={C.constLine} starColor={C.constStar} starOpacity={C.constStarOpacity} />
      ))}

      {/* ── LOGO ── */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={thread1} stroke={C.threadColor} strokeWidth={1.5} fill="none" opacity={C.threadOpacity} />
        <Path d={thread2} stroke={C.threadColor} strokeWidth={1.5} fill="none" opacity={C.threadOpacity} />
        {NODES.map((n, i) => (
          <SvgCircle key={i} cx={n.x} cy={n.y} r={R} fill={C.fg} opacity={1} />
        ))}
      </Svg>

      {/* ── DRIFT TEXT ── */}
      <View style={styles.textAnchor}>
        <Text style={[styles.driftText, { color: C.fg, opacity: C.textOpacity }]}>D R I F T</Text>
      </View>

      {/* ── OVERLAY ── */}
      <View style={styles.overlayContainer} pointerEvents="box-none">

        {/* CONSENT POPUP */}
        {phase === 'consent' && (
          <Animated.View 
            pointerEvents="auto"
            style={[
              styles.card, 
              { 
                backgroundColor: C.cardBg, 
                borderColor: C.cardBorder, 
                opacity: popupEntry,
                transform: [{ translateY: popupY }, { scale: popupScale }] 
              }
            ]}
          >
            <Text style={[styles.modalTitle, { color: C.cardTitle }]}>AWAKEN THE PALACE</Text>
            <Text style={[styles.modalBody, { color: C.cardBody }]}>
              Drift needs to download AI models (~600MB) to enable offline intelligence.
            </Text>
            <Pressable 
              style={({ pressed }) => [
                styles.actionButton, 
                { backgroundColor: C.btnBg, opacity: pressed ? 0.7 : 1 }
              ]} 
              onPress={() => onConsent?.()}
            >
              <Text style={[styles.actionButtonText, { color: C.btnText }]}>DOWNLOAD MODELS</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* DOWNLOAD PROGRESS */}
        {phase === 'downloading' && (
          <View style={styles.dashboard}>
            <View style={styles.telemetryRow}>
              <Text style={[styles.telemetryLabel, { color: C.telemetry }]}>{(status || '').toUpperCase()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {speed ? <Text style={[styles.speedLabel, { color: C.speedColor, marginRight: 8 }]}>{speed}</Text> : null}
                <Text style={[styles.pctLabel, { color: C.fg }]}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>

            {/* Progress bar with mini constellation at the end */}
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View style={[styles.progressTrack, { backgroundColor: C.trackBg, flex: 1 }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={{ marginLeft: 8 }}>
                <MiniConstellation patternIdx={barConstIdx} size={20} color={C.miniConst} />
              </View>
            </View>

            {/* Rotating tip with mini constellation */}
            <Animated.View style={{ opacity: tipFade, flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
              <MiniConstellation patternIdx={miniConstIdx} size={16} color={C.miniConst} />
              <Text style={[styles.tipText, { color: C.tipColor, marginLeft: 8 }]}>{TIPS[tipIdx]}</Text>
            </Animated.View>
          </View>
        )}

        {/* LOADING (post-download, setting up services) */}
        {phase === 'loading' && (
          <Animated.View style={{ opacity: tipFade, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MiniConstellation patternIdx={miniConstIdx} size={24} color={C.miniConst} />
              <Text style={[styles.loadingText, { color: C.tipColor, marginLeft: 10 }]}>{TIPS[tipIdx]}</Text>
            </View>
          </Animated.View>
        )}
        {/* CHECKING phase — restored as requested */}
        {phase === 'checking' && (
          <Text style={[styles.checkingText, { color: C.tipColor }]}>READING THE STARS...</Text>
        )}
      </View>
    </View>
  );
};

// ─── STYLES ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  textAnchor: { position:'absolute', top: NODES[2].y + R + 28, width: W, alignItems:'center' },
  driftText: { fontSize:13, fontWeight:'800', letterSpacing:14 },
  overlayContainer: { position:'absolute', bottom:90, width:'100%', alignItems:'center', paddingHorizontal:28, zIndex:1000 },
  card: { width:'100%', padding:28, borderRadius:28, borderWidth:1 },
  modalTitle: { fontSize:12, fontWeight:'900', marginBottom:12, letterSpacing:3 },
  modalBody: { fontSize:14, lineHeight:22, marginBottom:24 },
  actionButton: { paddingVertical:16, borderRadius:20, alignItems:'center' },
  actionButtonText: { fontWeight:'900', letterSpacing:1.5, fontSize:12 },
  dashboard: { width:'100%', alignItems:'flex-start' },
  telemetryRow: { flexDirection:'row', justifyContent:'space-between', width:'100%', marginBottom:10 },
  telemetryLabel: { fontSize:9, fontWeight:'800', letterSpacing:1.5 },
  speedLabel: { fontSize:10, fontWeight:'900' },
  pctLabel: { fontSize:11, fontWeight:'900' },
  progressTrack: { height:2, borderRadius:1, overflow:'hidden' },
  progressFill: { height:'100%', backgroundColor:'#F1C40F' },
  tipText: { fontSize:11, fontWeight:'500', letterSpacing:0.5 },
  loadingText: { fontSize:12, fontWeight:'500', letterSpacing:0.5 },
  checkingText: { fontSize:9, fontWeight:'800', letterSpacing:2 },
});
