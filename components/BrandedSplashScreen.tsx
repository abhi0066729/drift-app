import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

const { width, height } = Dimensions.get('window');

const LOGO_NODES = [
  { x: width * 0.32, y: height * 0.45 },
  { x: width * 0.41, y: height * 0.47 },
  { x: width * 0.50, y: height * 0.45 },
  { x: width * 0.59, y: height * 0.45 },
  { x: width * 0.68, y: height * 0.45 },
];

interface SplashProps {
  status?: string;
  progress?: number;
  speed?: string;
  onConsent?: () => void;
  needsConsent?: boolean;
}

export const BrandedSplashScreen = ({ status, progress = 0, speed, onConsent, needsConsent }: SplashProps) => {
  const wavePulse = useSharedValue(0);
  const glassOpacity = useSharedValue(0);
  const nebulaScale = useSharedValue(0.9);

  useEffect(() => {
    wavePulse.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    glassOpacity.value = withDelay(1000, withTiming(1, { duration: 1500 }));
    nebulaScale.value = withDelay(1000, withTiming(1, { duration: 2500 }));
  }, []);

  const path = useMemo(() => {
    const skPath = Skia.Path.Make();
    skPath.moveTo(LOGO_NODES[0].x, LOGO_NODES[0].y);
    for (let i = 1; i < LOGO_NODES.length; i++) {
      const prev = LOGO_NODES[i-1];
      const curr = LOGO_NODES[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      skPath.cubicTo(cp1x, prev.y, cp1x, curr.y, curr.x, curr.y);
    }
    return skPath;
  }, []);

  const glassStyle = useAnimatedStyle(() => ({ opacity: glassOpacity.value }));
  const nebulaStyle = useAnimatedStyle(() => ({
    opacity: glassOpacity.value * 0.4,
    transform: [{ scale: nebulaScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* BACKGROUND NEBULA */}
      <Animated.View style={[styles.nebulaContainer, nebulaStyle]}>
        {[...Array(15)].map((_, i) => (
          <View key={i} style={[styles.constellationNode, { 
            left: Math.random() * width, 
            top: Math.random() * height,
            width: 4 + Math.random() * 6,
            height: 4 + Math.random() * 6,
            backgroundColor: i % 2 === 0 ? '#8E44AD' : '#3498DB'
          }]} />
        ))}
      </Animated.View>

      {/* CORE LOGO & BRANDING */}
      <View style={styles.logoRoot}>
        <View style={styles.canvasContainer}>
          <Canvas style={{ flex: 1 }}>
            <Path path={path} color="black" style="stroke" strokeWidth={0.5} opacity={0.2} />
          </Canvas>
        </View>
        {LOGO_NODES.map((node, i) => (
          <View key={i} style={[styles.blackNode, { left: node.x - 10, top: node.y - 10 }]} />
        ))}
        <Animated.View entering={FadeIn.delay(500)} style={styles.textContainer}>
          <Text style={styles.driftText}>D R I F T</Text>
        </Animated.View>
      </View>

      {/* CONSENT MODAL OR PROGRESS DASHBOARD */}
      <View style={styles.overlayContainer}>
        {needsConsent ? (
          <Animated.View entering={FadeIn.duration(800)} exiting={FadeOut} style={styles.modalAnchor}>
            <BlurView intensity={60} tint="light" style={styles.glassCard}>
              <Text style={styles.modalTitle}>AWAKEN THE PALACE</Text>
              <Text style={styles.modalBody}>
                To enable offline intelligence, Drift needs to download its neural models (~600MB).
              </Text>
              <TouchableOpacity style={styles.actionButton} onPress={onConsent}>
                <Text style={styles.actionButtonText}>INITIALIZE SYNC</Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.dashboardAnchor}>
            {/* TELEMETRY ROW */}
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>{status?.toUpperCase()}</Text>
              {speed && <Text style={styles.speedLabel}>{speed}</Text>}
            </View>

            {/* PROGRESS FILAMENT */}
            <View style={styles.progressTrack}>
               <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            
            <Text style={styles.percentageText}>{Math.round(progress * 100)}% COMPLETE</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  logoRoot: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  blackNode: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: 'black', zIndex: 10 },
  canvasContainer: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  textContainer: { position: 'absolute', top: height * 0.45 + 50, width: '100%', alignItems: 'center' },
  driftText: { fontSize: 14, fontWeight: '300', color: 'black', letterSpacing: 12 },
  nebulaContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff' },
  constellationNode: { position: 'absolute', borderRadius: 10, opacity: 0.2 },
  overlayContainer: { position: 'absolute', bottom: 80, width: '100%', alignItems: 'center', paddingHorizontal: 40, zIndex: 100 },
  modalAnchor: { width: '100%', zIndex: 101 },

  glassCard: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },
  modalTitle: { fontSize: 14, fontWeight: '800', color: 'black', marginBottom: 12, letterSpacing: 2 },
  modalBody: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 20 },
  actionButton: { backgroundColor: 'black', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  actionButtonText: { color: 'white', fontWeight: 'bold', letterSpacing: 1 },
  dashboardAnchor: { width: '100%', alignItems: 'center' },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  telemetryLabel: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 1 },
  speedLabel: { fontSize: 10, fontWeight: '800', color: 'black' },
  progressTrack: { width: '100%', height: 2, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F1C40F' },
  percentageText: { marginTop: 12, fontSize: 10, fontWeight: '800', color: '#CCC', letterSpacing: 1 },
});
