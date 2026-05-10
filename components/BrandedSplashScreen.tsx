import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing,
  useColorScheme,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle, Line } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── CONSTELLATION PATTERNS ──────────────────────────────────
const PATTERNS = [
  { s:[[.35,.05],[.65,.05],[.50,.20],[.38,.40],[.50,.40],[.62,.40],[.28,.70],[.72,.70]], e:[[0,2],[1,2],[0,3],[1,5],[3,4],[4,5],[3,6],[5,7]] },
  { s:[[0,.50],[.20,.15],[.45,.10],[.65,.25],[.75,.55],[.60,.80],[.40,.70]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]] },
  { s:[[0,.30],[.25,.70],[.50,.20],[.75,.80],[1,.30]], e:[[0,1],[1,2],[2,3],[3,4]] },
  { s:[[.50,0],[.50,.35],[.50,.70],[.20,.35],[.80,.35],[.50,1]], e:[[0,1],[1,2],[2,5],[3,1],[4,1]] },
  { s:[[.10,.30],[.30,.10],[.50,.15],[.65,.30],[.80,.25],[.70,.50],[.50,.60],[.35,.55]], e:[[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7],[7,0]] },
  { s:[[.50,0],[.30,.40],[.70,.40],[.25,.70],[.75,.70]], e:[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4]] },
  { s:[[.15,.50],[.30,.20],[.50,.10],[.70,.20],[.85,.50],[.75,.75],[.25,.75]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[0,6]] },
  { s:[[.30,0],[.35,.15],[.40,.25],[.45,.40],[.50,.50],[.60,.60],[.70,.65],[.80,.70],[.85,.80],[.80,.90]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]] },
  { s:[[.30,0],[.70,0],[.25,.30],[.65,.25],[.20,.60],[.60,.55],[.30,.85],[.70,.80]], e:[[0,2],[2,4],[4,6],[1,3],[3,5],[5,7],[2,3]] },
  { s:[[.50,0],[.30,.30],[.70,.30],[.10,.60],[.50,.50],[.90,.60]], e:[[0,1],[0,2],[1,3],[1,4],[2,4],[2,5]] },
];

// ─── STAR FIELD ───────────────────────────────────────────────
const STARS = Array.from({ length: 120 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  r: 0.5 + Math.random() * 1.5, o: 0.15 + Math.random() * 0.45,
}));

// ─── LOGO NODES (placement unchanged, smaller radius, solid black) ──
const NODES = [
  { x: W * 0.22, y: H * 0.455 },
  { x: W * 0.36, y: H * 0.475 },
  { x: W * 0.50, y: H * 0.455 },
  { x: W * 0.64, y: H * 0.435 },
  { x: W * 0.78, y: H * 0.455 },
];
const R = W * 0.032; // smaller nodes

// ─── NATURAL THREAD (free-flowing, not pinned to nodes) ──────
// Uses additive sine waves for organic motion
const CENTER_Y = H * 0.455;
const THREAD_POINTS = 150; // smooth resolution

function buildNaturalThread(time: number, phaseOff: number, targetNode: typeof NODES[0] | null): string {
  const parts: string[] = [];
  const startX = NODES[0].x;
  const endX = NODES[NODES.length - 1].x;
  const span = endX - startX;

  for (let i = 0; i <= THREAD_POINTS; i++) {
    const t = i / THREAD_POINTS;
    const x = startX + span * t;

    // Additive synthesis: multiple sine waves = organic motion
    const wave1 = Math.sin(t * Math.PI * 3.2 - time * 1.4 + phaseOff) * 22;
    const wave2 = Math.sin(t * Math.PI * 5.7 - time * 0.9 + phaseOff * 0.7) * 8;
    const wave3 = Math.sin(t * Math.PI * 1.1 + time * 0.5 + phaseOff * 1.3) * 12;

    // Gentle drift of the baseline
    const drift = Math.sin(t * Math.PI * 0.8 + time * 0.3) * 6;

    // Taper at edges so thread fades in/out gracefully
    const edgeFade = Math.sin(t * Math.PI);

    let y = CENTER_Y + (wave1 + wave2 + wave3 + drift) * edgeFade * 0.7;

    // ATTRACTOR: pull thread through one random middle node
    if (targetNode) {
      const dx = (x - targetNode.x) / (span * 0.12); // gaussian width
      const pull = Math.exp(-dx * dx);                // 1.0 at node, fades smoothly
      y = y + (targetNode.y - y) * pull;              // blend toward node position
    }

    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

// ─── CONSTELLATION INSTANCE ──────────────────────────────────
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
    pattern.s.map(([sx, sy]) => ({ x: cx + (sx - 0.5) * scale, y: cy + (sy - 0.5) * scale })),
  [pattern, cx, cy, scale]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {pattern.e.map(([a, b], i) => (
          <Line key={`e${i}`} x1={positions[a].x} y1={positions[a].y}
            x2={positions[b].x} y2={positions[b].y} stroke={lineColor} strokeWidth={0.8} />
        ))}
        {positions.map((p, i) => (
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
  status?: string; progress?: number; speed?: string;
  onConsent?: () => void; needsConsent?: boolean;
}

// ─── MAIN ─────────────────────────────────────────────────────
export const BrandedSplashScreen = ({ status, progress = 0, speed, onConsent, needsConsent }: SplashProps) => {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  // Dynamic color palette
  const C = useMemo(() => ({
    bg: dark ? '#000' : '#F2F2F2',
    fg: dark ? '#fff' : '#000',
    threadColor: dark ? '#fff' : '#000',
    threadOpacity: dark ? 0.35 : 0.25,
    starColor: dark ? '#fff' : '#000',
    constLine: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)',
    constStar: dark ? 'white' : 'black',
    constStarOpacity: dark ? 0.9 : 0.5,
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
  }), [dark]);
  const [thread1, setThread1] = useState('');
  const [thread2, setThread2] = useState('');
  const timeRef = useRef(0);
  const rafRef = useRef<number>();
  // Which middle node each thread is attracted to (indices 1, 2, or 3)
  const target1Ref = useRef(NODES[1 + Math.floor(Math.random() * 3)]);
  const target2Ref = useRef(NODES[1 + Math.floor(Math.random() * 3)]);
  const [constellations, setConstellations] = useState<Array<{
    id: number; patternIdx: number; cx: number; cy: number; scale: number;
  }>>([]);
  const ctrRef = useRef(0);

  // Rotate target node every ~5 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      target1Ref.current = NODES[1 + Math.floor(Math.random() * 3)];
      target2Ref.current = NODES[1 + Math.floor(Math.random() * 3)];
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Natural wave animation
  useEffect(() => {
    const tick = () => {
      timeRef.current += 0.016;
      setThread1(buildNaturalThread(timeRef.current, 0, target1Ref.current));
      setThread2(buildNaturalThread(timeRef.current, 2.1, target2Ref.current));
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

  const twinklers = useMemo(() =>
    STARS.filter(() => Math.random() > 0.7).map((s, i) => ({ ...s, delay: i * 300 })),
  []);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* ── STAR FIELD ── */}
      {STARS.map((s, i) => (
        <View key={i} style={{ position:'absolute', left:s.x, top:s.y, width:s.r*2, height:s.r*2, borderRadius:s.r, backgroundColor:C.starColor, opacity:s.o * (dark ? 1 : 0.25) }} />
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
      <View style={styles.overlayContainer}>
        {needsConsent ? (
          <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: C.cardTitle }]}>AWAKEN THE PALACE</Text>
            <Text style={[styles.modalBody, { color: C.cardBody }]}>
              To enable offline intelligence, Drift needs to synchronize its neural grid (~600MB).
            </Text>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: C.btnBg }]} onPress={onConsent} activeOpacity={0.7}>
              <Text style={[styles.actionButtonText, { color: C.btnText }]}>INITIALIZE SYNC</Text>
            </TouchableOpacity>
          </View>
        ) : status ? (
          <View style={styles.dashboard}>
            <View style={styles.telemetryRow}>
              <Text style={[styles.telemetryLabel, { color: C.telemetry }]}>{status.toUpperCase()}</Text>
              {speed && <Text style={[styles.speedLabel, { color: C.speedColor }]}>{speed}</Text>}
            </View>
            <View style={[styles.progressTrack, { backgroundColor: C.trackBg }]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={[styles.pctText, { color: C.pctColor }]}>{Math.round(progress * 100)}% COMPLETE</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  textAnchor: { position:'absolute', top: NODES[2].y + R + 28, width: W, alignItems:'center' },
  driftText: { fontSize:13, fontWeight:'300', color:'#fff', letterSpacing:14, opacity:0.7 },
  overlayContainer: { position:'absolute', bottom:90, width:'100%', alignItems:'center', paddingHorizontal:28, zIndex:1000 },
  card: { width:'100%', backgroundColor:'rgba(255,255,255,0.06)', padding:28, borderRadius:28, borderWidth:1, borderColor:'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize:12, fontWeight:'900', color:'#fff', marginBottom:12, letterSpacing:3 },
  modalBody: { fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:22, marginBottom:24 },
  actionButton: { backgroundColor:'#fff', paddingVertical:16, borderRadius:20, alignItems:'center' },
  actionButtonText: { color:'#000', fontWeight:'900', letterSpacing:1.5, fontSize:12 },
  dashboard: { width:'100%', alignItems:'center' },
  telemetryRow: { flexDirection:'row', justifyContent:'space-between', width:'100%', marginBottom:10 },
  telemetryLabel: { fontSize:9, fontWeight:'800', color:'rgba(255,255,255,0.4)', letterSpacing:1.5 },
  speedLabel: { fontSize:10, fontWeight:'900', color:'#fff' },
  progressTrack: { width:'100%', height:2, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:1, overflow:'hidden' },
  progressFill: { height:'100%', backgroundColor:'#F1C40F' },
  pctText: { marginTop:14, fontSize:10, fontWeight:'900', color:'rgba(255,255,255,0.3)', letterSpacing:2 },
});
