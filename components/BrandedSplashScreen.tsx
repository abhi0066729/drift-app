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
const STARS = Array.from({ length: 60 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: 0.5 + Math.random() * 1.5, o: 0.15 + Math.random() * 0.45,
}));

// ─── LOGO NODES & THREAD (Replaced with 3D Wireframe Mountain Peak Mesh) ─────
const COLS = 26;
const ROWS = 14;

// Get projected coordinates of a point in the wireframe grid
function getProjectedPoint(
  col: number, 
  row: number, 
  time: number, 
  W: number, 
  H: number
) {
  const mountWidth = W * 0.82;
  const mountHeight = 120;
  const startX = W * 0.09;
  const startY = H * 0.46; // Center vertically

  const dx = col / (COLS - 1);
  const dy = row / (ROWS - 1);

  // Skew x slightly based on row to give 3D tilt perspective
  const x = startX + dx * mountWidth + (dy - 0.5) * 24;

  // Mountain Profile (Two main gaussian peaks + roughness)
  const peak1Center = 0.35;
  const peak1Width = 0.12;
  const peak1Height = 48;

  const peak2Center = 0.65;
  const peak2Width = 0.14;
  const peak2Height = 72;

  // Gaussian formulas for the peaks
  const g1 = Math.exp(-Math.pow((dx - peak1Center) / peak1Width, 2));
  const g2 = Math.exp(-Math.pow((dx - peak2Center) / peak2Width, 2));

  // Dynamic wave animation ripple representing "drifting resonance"
  const wave = Math.sin(dx * Math.PI * 3.5 - time * 1.8) * Math.cos(dy * Math.PI * 2.0 + time * 1.2) * 3.5;
  
  // Height profile diminishes near the front edges (lower rows) and far side boundaries
  const edgeFadeX = Math.sin(dx * Math.PI);
  const edgeFadeY = Math.sin(dy * Math.PI);

  const baseHeight = (g1 * peak1Height + g2 * peak2Height) * edgeFadeX * (0.35 + 0.65 * edgeFadeY);
  
  const y = startY + dy * 45 - (baseHeight + wave);

  return { x, y };
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
    bg: dark ? '#000' : '#FFFFFF',
    fg: dark ? '#fff' : '#000',
    threadColor: '#E8673C', // Always orange mountain wires
    threadOpacity: dark ? 0.75 : 0.65,
    starColor: dark ? '#fff' : '#000',
    starOpacity: dark ? 1 : 0.35,          // boosted from 0.25
    constLine: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.18)',  // boosted from 0.12
    constStar: dark ? 'white' : 'black',
    constStarOpacity: dark ? 0.9 : 0.6,    // boosted from 0.5
    textOpacity: dark ? 0.85 : 0.95,
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
  const [wireLines, setWireLines] = useState<React.ReactNode[]>([]);
  const timeRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);
 
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
 
  // Wireframe mountain generation loop
  useEffect(() => {
    const tick = () => {
      timeRef.current += 0.024;
      const t = timeRef.current;
      
      const elements: React.ReactNode[] = [];

      // Generate horizontal latitude lines
      for (let r = 0; r < ROWS; r++) {
        let path = '';
        for (let c = 0; c < COLS; c++) {
          const pt = getProjectedPoint(c, r, t, W, H);
          path += `${c === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        }
        elements.push(
          <Path 
            key={`lat-${r}`} 
            d={path} 
            stroke={C.threadColor} 
            strokeWidth={0.7} 
            fill="none" 
            opacity={C.threadOpacity * (0.3 + 0.7 * (r / (ROWS - 1)))} 
          />
        );
      }

      // Generate vertical longitude lines
      for (let c = 0; c < COLS; c++) {
        let path = '';
        for (let r = 0; r < ROWS; r++) {
          const pt = getProjectedPoint(c, r, t, W, H);
          path += `${r === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        }
        elements.push(
          <Path 
            key={`long-${c}`} 
            d={path} 
            stroke={C.threadColor} 
            strokeWidth={0.6} 
            fill="none" 
            opacity={C.threadOpacity * 0.75 * (0.35 + 0.65 * (c % 2 === 0 ? 1 : 0.4))} 
          />
        );
      }

      setWireLines(elements);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [C.threadColor, C.threadOpacity]);
 
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
    <View style={[styles.container, { backgroundColor: dark ? '#000000' : '#FFFFFF' }]}>
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
 
      {/* ── LOGO (3D Wireframe Mountains) ── */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {wireLines}
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
  textAnchor: { position:'absolute', top: H * 0.53, width: W, alignItems:'center' },
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
