import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
} from 'react-native';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── LOGO NODES ───────────────────────────────────────────────
// Matching the reference: 5 black circles, node2 dips, node4 rises
const NODES = [
  { x: W * 0.22, y: H * 0.455 },
  { x: W * 0.36, y: H * 0.475 },    // dips lower
  { x: W * 0.50, y: H * 0.455 },
  { x: W * 0.64, y: H * 0.435 },    // rises higher
  { x: W * 0.78, y: H * 0.455 },
];
const R = W * 0.042; // node radius (~16px on iPhone)

// ─── WAVE THREAD ENGINE ───────────────────────────────────────
const SAMPLES_PER_SEG = 30;

function buildThreadPath(time: number, amplitude: number, phaseOffset: number): string {
  const parts: string[] = [];

  for (let seg = 0; seg < NODES.length - 1; seg++) {
    const a = NODES[seg];
    const b = NODES[seg + 1];

    for (let i = 0; i <= SAMPLES_PER_SEG; i++) {
      const t = i / SAMPLES_PER_SEG;
      const x = a.x + (b.x - a.x) * t;
      const baseY = a.y + (b.y - a.y) * t;

      // Envelope: zero at node endpoints, max at midpoint
      const envelope = Math.sin(t * Math.PI);
      // Traveling wave
      const wave = Math.sin(t * Math.PI * 2 + time * 2.5 + seg * 1.8 + phaseOffset) * amplitude * envelope;

      const y = baseY + wave;
      const cmd = seg === 0 && i === 0 ? 'M' : 'L';
      parts.push(`${cmd}${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  return parts.join(' ');
}

// ─── PROPS ────────────────────────────────────────────────────
interface SplashProps {
  status?: string;
  progress?: number;
  speed?: string;
  onConsent?: () => void;
  needsConsent?: boolean;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export const BrandedSplashScreen = ({
  status, progress = 0, speed, onConsent, needsConsent,
}: SplashProps) => {
  const [thread1, setThread1] = useState('');
  const [thread2, setThread2] = useState('');
  const timeRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const tick = () => {
      timeRef.current += 0.025;
      const t = timeRef.current;

      // Two threads with different phases → wave/weave effect
      setThread1(buildThreadPath(t, 14, 0));
      setThread2(buildThreadPath(t, 14, Math.PI));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>

      {/* ── WAVE THREADS + NODES ── */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {/* Thread 1 */}
        <Path d={thread1} stroke="#000" strokeWidth={1} fill="none" opacity={0.35} />
        {/* Thread 2 */}
        <Path d={thread2} stroke="#000" strokeWidth={1} fill="none" opacity={0.35} />

        {/* Black nodes */}
        {NODES.map((n, i) => (
          <SvgCircle key={i} cx={n.x} cy={n.y} r={R} fill="#000" />
        ))}
      </Svg>

      {/* ── DRIFT TEXT ── */}
      <View style={styles.textAnchor}>
        <Text style={styles.driftText}>D R I F T</Text>
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
  container: { flex: 1, backgroundColor: '#F2F2F2' },

  textAnchor: {
    position: 'absolute',
    top: NODES[2].y + R + 28,
    width: W,
    alignItems: 'center',
  },
  driftText: {
    fontSize: 14, fontWeight: '400', color: '#000',
    letterSpacing: 12, opacity: 0.85,
  },

  overlayContainer: {
    position: 'absolute', bottom: 90, width: '100%',
    alignItems: 'center', paddingHorizontal: 28, zIndex: 1000,
  },
  card: {
    width: '100%', backgroundColor: '#111',
    padding: 28, borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1, borderColor: '#222',
  },
  modalTitle: {
    fontSize: 12, fontWeight: '900', color: '#fff',
    marginBottom: 12, letterSpacing: 3,
  },
  modalBody: {
    fontSize: 14, color: 'rgba(255,255,255,0.50)',
    lineHeight: 22, marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#fff', paddingVertical: 16,
    borderRadius: 20, alignItems: 'center',
  },
  actionButtonText: {
    color: '#000', fontWeight: '900', letterSpacing: 1.5, fontSize: 12,
  },

  dashboard: { width: '100%', alignItems: 'center' },
  telemetryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', marginBottom: 10,
  },
  telemetryLabel: {
    fontSize: 9, fontWeight: '800', color: '#999', letterSpacing: 1.5,
  },
  speedLabel: { fontSize: 10, fontWeight: '900', color: '#333' },
  progressTrack: {
    width: '100%', height: 2, backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 1, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#F1C40F' },
  pctText: {
    marginTop: 14, fontSize: 10, fontWeight: '900',
    color: '#BBB', letterSpacing: 2,
  },
});
