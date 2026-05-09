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

  // ... (rest of the path logic remains the same)

  return (
    <View style={styles.container}>
      {/* ... (Nebula and Glass layers remain the same) */}
      
      {/* 3. THE CORE LOGO */}
      <View style={styles.logoRoot}>
        {/* ... (Nodes and Logo text remain the same) */}
        
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
    backgroundColor: '#FFFFFF', // Pure White Background
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
    backgroundColor: '#F1C40F', // Golden Filament
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

