import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withRepeat, 
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { NightTheme } from '@/constants/theme';
import { Sparkles, Activity } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CelestialPortalProps {
  hub: {
    id: string;
    category: string;
    title: string;
    count: number;
    center: { x: number, y: number };
    color: string;
  };
  activeView: string;
}

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

export default function CelestialPortal({ hub, activeView }: CelestialPortalProps) {
  const isNexus = activeView === 'nexus';
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 3000 }), 
      -1, 
      true
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    const scale = isNexus ? withSpring(1) : withSpring(0.4);
    const opacity = isNexus ? withSpring(1) : withSpring(0);
    const translateY = interpolate(pulse.value, [0, 1], [-5, 5], Extrapolate.CLAMP);

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.4], Extrapolate.CLAMP);
    const opacity = interpolate(pulse.value, [0, 1], [0.3, 0.6], Extrapolate.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { top: hub.center.y - 100, left: hub.center.x - 100 },
        containerStyle
      ]}
    >
      {/* Background Radial Glow */}
      <Animated.View style={[styles.glowContainer, glowStyle]}>
        <Svg width={200} height={200}>
          <Defs>
            <RadialGradient id={`grad-${hub.id}`} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={hub.color} stopOpacity="1" />
              <Stop offset="100%" stopColor={hub.color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="100" cy="100" r="100" fill={`url(#grad-${hub.id})`} />
        </Svg>
      </Animated.View>

      {/* Glassmorphic Portal Face */}
      <View style={[styles.glassCard, { borderColor: hub.color }]}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${hub.color}33` }]}>
            <Sparkles size={14} color={hub.color} />
          </View>
          <Text style={styles.countText}>{hub.count} RESONANCES</Text>
        </View>

        <Text style={[styles.title, { color: hub.color }]}>{hub.title}</Text>
        
        <View style={styles.footer}>
          <Activity size={10} color="#95A5A6" />
          <Text style={styles.footerText}>TOPIC CENTROID</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  glowContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    zIndex: -1,
  },
  glassCard: {
    width: 140,
    height: 140,
    borderRadius: 70, // Perfectly Circular Portal
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    ...NightTheme.shadowLarge,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  countText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#95A5A6',
    letterSpacing: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  footerText: {
    fontSize: 6,
    fontWeight: '700',
    color: '#95A5A6',
    letterSpacing: 0.5,
  }
});
