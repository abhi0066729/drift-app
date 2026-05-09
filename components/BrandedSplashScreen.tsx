import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing,
  interpolate,
  FadeIn
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
}

export const BrandedSplashScreen = ({ status, progress = 0 }: SplashProps) => {
  const wavePulse = useSharedValue(0);
  const glassOpacity = useSharedValue(0);
  const nebulaScale = useSharedValue(0.9);

  useEffect(() => {
    // 1. Wave Animation (Infinite)
    wavePulse.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    // 2. Delayed Galactic Reveal (Glassmorphism)
    glassOpacity.value = withDelay(2500, withTiming(1, { duration: 2000 }));
    nebulaScale.value = withDelay(2500, withTiming(1, { duration: 3000 }));
  }, []);

  // Waveform Path Logic (passing through logo nodes)
  const path = useMemo(() => {
    const skPath = Skia.Path.Make();
    skPath.moveTo(LOGO_NODES[0].x, LOGO_NODES[0].y);
    
    for (let i = 1; i < LOGO_NODES.length; i++) {
      const prev = LOGO_NODES[i-1];
      const curr = LOGO_NODES[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      skPath.cubicTo(cp1x, prev.y, cp2x, curr.y, curr.x, curr.y);
    }
    return skPath;
  }, []);

  const glassStyle = useAnimatedStyle(() => ({
    opacity: glassOpacity.value,
  }));

  const nebulaStyle = useAnimatedStyle(() => ({
    opacity: glassOpacity.value * 0.4,
    transform: [{ scale: nebulaScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* 1. THE CONSTELLATIONS (Behind the Glass) */}
      <Animated.View style={[styles.nebulaContainer, nebulaStyle]}>
        {[...Array(12)].map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.constellationNode, 
              { 
                left: Math.random() * width, 
                top: Math.random() * height,
                width: 4 + Math.random() * 8,
                height: 4 + Math.random() * 8,
                backgroundColor: i % 2 === 0 ? '#8E44AD' : '#3498DB'
              }
            ]} 
          />
        ))}
      </Animated.View>

      {/* 2. THE GLASS LAYER */}
      <Animated.View style={[StyleSheet.absoluteFill, glassStyle]}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* 3. THE CORE LOGO */}
      <View style={styles.logoRoot}>
        {/* Animated Waveform Threads */}
        <View style={styles.canvasContainer}>
          <Canvas style={{ flex: 1 }}>
            <Path
              path={path}
              color="black"
              style="stroke"
              strokeWidth={0.5}
              opacity={0.3}
            />
          </Canvas>
        </View>

        {/* The 5 Black Nodes */}
        {LOGO_NODES.map((node, i) => (
          <View 
            key={i} 
            style={[styles.blackNode, { left: node.x - 10, top: node.y - 10 }]} 
          />
        ))}

        {/* The DRIFT Text */}
        <Animated.View entering={FadeIn.delay(500)} style={styles.textContainer}>
          <Text style={styles.driftText}>D R I F T</Text>
        </Animated.View>

        {/* PROGRESS FILAMENT */}
        <View style={styles.progressTrack}>
           <Animated.View 
             style={[
               styles.progressFill, 
               { width: `${progress * 100}%` }
             ]} 
           />
        </View>

        {/* STATUS PILL */}
        {status && (
          <Animated.View entering={FadeIn.delay(1000)} style={styles.statusPillContainer}>
            <BlurView intensity={20} tint="light" style={styles.statusPill}>
              <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            </BlurView>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blackNode: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'black',
    zIndex: 10,
  },
  canvasContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  textContainer: {
    position: 'absolute',
    top: height * 0.45 + 50,
    width: '100%',
    alignItems: 'center',
  },
  driftText: {
    fontSize: 14,
    fontWeight: '300',
    color: 'black',
    letterSpacing: 12,
    fontFamily: 'Inter',
  },
  nebulaContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  constellationNode: {
    position: 'absolute',
    borderRadius: 10,
    opacity: 0.3,
  },
  progressTrack: {
    position: 'absolute',
    top: height * 0.45 + 85,
    width: width * 0.4,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F1C40F',
  },
  statusPillContainer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 2,
  },
});
