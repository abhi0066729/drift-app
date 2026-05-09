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
import * as Haptics from 'expo-haptics';

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
    glassOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));
    nebulaScale.value = withDelay(500, withTiming(1, { duration: 2000 }));
    
    if (needsConsent) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [needsConsent]);

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

  const nebulaStyle = useAnimatedStyle(() => ({
    opacity: glassOpacity.value * 0.3,
    transform: [{ scale: nebulaScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* NEBULA BACKGROUND */}
      <Animated.View style={[styles.nebulaContainer, nebulaStyle]}>
        {[...Array(12)].map((_, i) => (
          <View key={i} style={[styles.constellationNode, { 
            left: Math.random() * width, 
            top: Math.random() * height,
            width: 4 + Math.random() * 8,
            height: 4 + Math.random() * 8,
            backgroundColor: i % 2 === 0 ? '#3498DB' : '#8E44AD'
          }]} />
        ))}
      </Animated.View>

      {/* CORE LOGO */}
      <View style={styles.logoRoot}>
        <View style={styles.canvasContainer}>
          <Canvas style={{ flex: 1 }}>
            <Path path={path} color="black" style="stroke" strokeWidth={0.5} opacity={0.15} />
          </Canvas>
        </View>
        {LOGO_NODES.map((node, i) => (
          <View key={i} style={[styles.blackNode, { left: node.x - 10, top: node.y - 10 }]} />
        ))}
        <Animated.View entering={FadeIn.delay(300)} style={styles.textContainer}>
          <Text style={styles.driftText}>D R I F T</Text>
        </Animated.View>
      </View>

      {/* INTERACTION OVERLAY */}
      <View style={styles.overlayContainer}>
        {needsConsent ? (
          <Animated.View entering={FadeIn.duration(600)} exiting={FadeOut} style={styles.modalAnchor}>
            <BlurView intensity={80} tint="dark" style={styles.glassCard}>
              <Text style={styles.modalTitle}>AWAKEN THE PALACE</Text>
              <Text style={styles.modalBody}>
                To enable offline intelligence, Drift needs to synchronize its neural grid (~600MB).
              </Text>
              <TouchableOpacity style={styles.actionButton} onPress={onConsent} activeOpacity={0.7}>
                <Text style={styles.actionButtonText}>INITIALIZE SYNC</Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        ) : status ? (
          <Animated.View entering={FadeIn} style={styles.dashboardAnchor}>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>{status.toUpperCase()}</Text>
              {speed && <Text style={styles.speedLabel}>{speed}</Text>}
            </View>
            <View style={styles.progressTrack}>
               <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.percentageText}>{Math.round(progress * 100)}% COMPLETE</Text>
          </Animated.View>
        ) : null}
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
  driftText: { fontSize: 13, fontWeight: '300', color: 'black', letterSpacing: 14, opacity: 0.8 },
  nebulaContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff' },
  constellationNode: { position: 'absolute', borderRadius: 10, opacity: 0.15 },
  overlayContainer: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center', paddingHorizontal: 30, zIndex: 100 },
  modalAnchor: { width: '100%', zIndex: 101, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  glassCard: { padding: 30, borderRadius: 40, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 13, fontWeight: '900', color: 'white', marginBottom: 12, letterSpacing: 2.5 },
  modalBody: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22, marginBottom: 25 },
  actionButton: { backgroundColor: 'white', paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
  actionButtonText: { color: 'black', fontWeight: '900', letterSpacing: 1.5, fontSize: 12 },
  dashboardAnchor: { width: '100%', alignItems: 'center' },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  telemetryLabel: { fontSize: 9, fontWeight: '800', color: '#888', letterSpacing: 1.5 },
  speedLabel: { fontSize: 10, fontWeight: '900', color: 'black' },
  progressTrack: { width: '100%', height: 3, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F1C40F' },
  percentageText: { marginTop: 15, fontSize: 10, fontWeight: '900', color: '#BBB', letterSpacing: 2 },
});
