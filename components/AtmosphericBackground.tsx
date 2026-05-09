import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  interpolate,
  useDerivedValue
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// --- 1. Starfield Particle ---
const Particle = ({ index, color, opacity: baseOpacity }: { index: number, color: string, opacity: number }) => {
  const x = useSharedValue(Math.random() * width);
  const y = useSharedValue(Math.random() * height);
  const opacity = useSharedValue(baseOpacity + Math.random() * 0.3);

  useEffect(() => {
    const duration = 15000 + Math.random() * 20000;
    x.value = withRepeat(
      withTiming(x.value + (Math.random() - 0.5) * 200, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    y.value = withRepeat(
      withTiming(y.value + (Math.random() - 0.5) * 200, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    opacity: opacity.value,
    transform: [{ scale: 0.5 + (index % 3) * 0.3 }],
  }));

  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />;
};

// --- 2. Nebula Blob ---
const NebulaBlob = ({ color, radius, duration, xPos, yPos }: { color: string, radius: number, duration: number, xPos: number, yPos: number }) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    tx.value = withRepeat(
      withSequence(
        withTiming(radius, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(-radius, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    ty.value = withRepeat(
      withSequence(
        withTiming(-radius * 0.5, { duration: duration * 1.5, easing: Easing.inOut(Easing.sin) }),
        withTiming(radius * 0.5, { duration: duration * 1.5, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withTiming(1.2, { duration: duration * 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value }
    ],
    backgroundColor: color,
    width: radius * 3,
    height: radius * 3,
    borderRadius: radius * 1.5,
    top: yPos,
    left: xPos,
  }));

  return <Animated.View style={[styles.blob, style]} />;
};

// --- 3. Unified Background Component ---
interface AtmosphericBackgroundProps {
  type: 'constellation' | 'flow' | 'nebula';
  colors: string[];
  particleCount?: number;
  theme: 'light' | 'dark';
}

export const AtmosphericBackground = ({ type, colors, particleCount = 15, theme }: AtmosphericBackgroundProps) => {
  const isDark = theme === 'dark';
  const baseOpacity = isDark ? 0.1 : 0.05;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Nebula Layer */}
      {colors.length > 0 && (
        <View style={StyleSheet.absoluteFill}>
          <NebulaBlob color={colors[0]} radius={120} duration={12000} xPos={-100} yPos={-100} />
          {colors.length > 1 && (
             <NebulaBlob color={colors[1]} radius={160} duration={16000} xPos={width - 200} yPos={height - 300} />
          )}
        </View>
      )}

      {/* 2. Particle Layer */}
      {type === 'constellation' && (
        <View style={StyleSheet.absoluteFill}>
          {[...Array(particleCount)].map((_, i) => (
            <Particle 
              key={i} 
              index={i} 
              color={isDark ? (colors[0] || '#7C3AED') : '#7C3AED'} 
              opacity={baseOpacity} 
            />
          ))}
        </View>
      )}

      {/* 3. Flow Layer (Optional filter) */}
      {type === 'flow' && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.02)' }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
  },
  blob: {
    position: 'absolute',
    opacity: 0.08,
    // Note: React Native blur is only on iOS/Android via specialized libs, 
    // but opacity + large radius creates a decent 'aura' effect.
  },
});
