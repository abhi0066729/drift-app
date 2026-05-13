import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import * as SplashScreen from 'expo-splash-screen';

const { width: W, height: H } = Dimensions.get('window');

// Create animated wrappers
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface NodeData {
  cx: number;
  cy: number;
  r: number;
  f?: string;
  s?: string;
  sw?: number;
}


export const OpeningTransition = ({ onComplete }: { onComplete: () => void }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const BG_COLOR = isDark ? '#000000' : '#FFFFFF';
  const THEME_COLOR = isDark ? '#e0dbd2' : '#000000';
  const CORE_BG = isDark ? '#000000' : '#FFFFFF';
  const STROKE_COLOR = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const main = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Kill native splash immediately to show this animation
    SplashScreen.hideAsync().catch(() => {});

    // SYNCHRONIZED START
    Animated.timing(main, {
      toValue: 1,
      duration: 2200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start(() => {
      // Primary logo animation done, now fade out.
      // If fadeOut fails to start or finish, we should still call onComplete eventually.
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        clearTimeout(safetyTimer);
        onComplete();
      });
      
      // Secondary safety: ensure we proceed if fadeOut hangs
      setTimeout(() => onComplete(), 1500);
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  const far = Math.max(W, H) * 1.8;
  const targetScale = (Math.max(W, H) / 90) * 0.75;

  const renderFrontNodes = () => {
    const pairDirs = [
      { dx: -1.0, dy: -1.1, rot: -340 },
      { dx: -1.0, dy: 1.1, rot: 310 },
      { dx: 0.6, dy: -1.2, rot: 380 },
      { dx: 0.6, dy: 1.2, rot: -360 },
      { dx: 1.4, dy: 0.0, rot: 260 },
    ];

    const nodePairs: NodeData[][] = [
      [{ cx: 31, cy: 27, r: 6.5, f: THEME_COLOR }, { cx: 31, cy: 27, r: 3, f: BG_COLOR }],
      [{ cx: 31, cy: 187, r: 6.5, f: THEME_COLOR }, { cx: 31, cy: 187, r: 3, f: BG_COLOR }],
      [{ cx: 95, cy: 27, r: 5.5, s: THEME_COLOR, sw: 2.5 }],
      [{ cx: 95, cy: 187, r: 5.5, s: THEME_COLOR, sw: 2.5 }],
      [{ cx: 171, cy: 107, r: 6.5, f: THEME_COLOR }, { cx: 171, cy: 107, r: 3, f: BG_COLOR }]
    ];

    return nodePairs.map((pair, i) => {
      const { dx, dy, rot } = pairDirs[i];
      return pair.map((node, ni) => (
        <AnimatedCircle
          key={`${i}-${ni}`}
          cx={node.cx}
          cy={node.cy}
          r={node.r}
          fill={node.f || 'none'}
          stroke={node.s}
          strokeWidth={node.sw}
          opacity={main.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }) as any}
          transform={[
            { translateX: main.interpolate({ inputRange: [0, 1], outputRange: [0, dx * far] }) },
            { translateY: main.interpolate({ inputRange: [0, 1], outputRange: [0, dy * far] }) },
            { rotate: main.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rot}deg`] }) }
          ] as any}
        />
      ));
    });
  };

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeOut, backgroundColor: BG_COLOR, overflow: 'visible' }]}
    >
      <Animated.View style={{
        overflow: 'visible',
        transform: [
          // THE VOID DIVE: Unified scale and translate starting from t=0
          { scale: main.interpolate({ inputRange: [0, 1], outputRange: [1, targetScale] }) },
          { translateX: main.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.5] }) },
          { translateY: main.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.2] }) }
        ] as any
      }}>
        <Svg width={270} height={270} viewBox="0 0 270 270" style={{ overflow: 'visible' }}>
          {/* BG - Spins and fades */}
          <AnimatedRect
            x={0} y={0} width={270} height={270} fill={BG_COLOR} stroke={BG_COLOR} strokeWidth={3}
            opacity={main.interpolate({ inputRange: [0, 0.8], outputRange: [1, 0] }) as any}
            transform={[
              { rotate: main.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
              { scale: main.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }
            ] as any}
          />

          {/* Topbar - Flies away */}
          <AnimatedRect
            x={0} y={0} width={270} height={5} fill={THEME_COLOR}
            transform={[{ translateY: main.interpolate({ inputRange: [0, 1], outputRange: [0, -far] }) }] as any}
          />

          {/* Layer 3 - Fracture Outward */}
          <AnimatedPath
            d="M57 53 L57 213 L121 213 Q195 213 195 133 Q195 53 121 53 Z" fill="none" stroke={THEME_COLOR} strokeWidth={0.8}
            opacity={0.18}
            transform={[
              { translateX: main.interpolate({ inputRange: [0, 1], outputRange: [0, far * 0.6] }) },
              { translateY: main.interpolate({ inputRange: [0, 1], outputRange: [0, -far * 0.5] }) },
              { rotate: main.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '220deg'] }) }
            ] as any}
          />

          {/* Layer 2 - Fracture Outward */}
          <AnimatedPath
            d="M45 41 L45 201 L109 201 Q183 201 183 121 Q183 41 109 41 Z" fill="none" stroke={THEME_COLOR} strokeWidth={2}
            opacity={0.32}
            transform={[
              { translateX: main.interpolate({ inputRange: [0, 1], outputRange: [0, -far * 0.7] }) },
              { translateY: main.interpolate({ inputRange: [0, 1], outputRange: [0, far * 0.1] }) },
              { rotate: main.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] }) }
            ] as any}
          />

          {/* Bridges - Fade instantly */}
          <AnimatedG
            opacity={main.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0] }) as any}
            transform={[{ translateY: main.interpolate({ inputRange: [0, 1], outputRange: [0, -100] }) }] as any}
          >
            <Line x1="31" y1="27" x2="45" y2="41" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.35} />
            <Line x1="95" y1="27" x2="109" y2="41" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.32} />
            <Line x1="171" y1="107" x2="183" y2="121" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.32} />
            <Line x1="31" y1="187" x2="57" y2="213" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.28} />
          </AnimatedG>

          {/* THE CORE D - Split into two parts with opposing movements */}
          {/* 1. THE BAR - Moves Left */}
          <AnimatedG transform={[
            { translateX: main.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
            { rotate: main.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
            { scale: main.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }
          ] as any}>
            <Path d="M31 27 L67 27 L67 187 L31 187 Z" fill="none" stroke={THEME_COLOR} strokeWidth={0.8} opacity={0.4} />

          </AnimatedG>

          {/* 2. THE CURVE - Moves Right */}
          <AnimatedG transform={[
            { translateX: main.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) },
            { rotate: main.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-45deg'] }) },
            { scale: main.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }
          ] as any}>
            <Path
              d="M67 27 L95 27 Q171 27 171 107 Q171 187 95 187 L67 187 Z"
              fill={THEME_COLOR}
              stroke={STROKE_COLOR}
              strokeWidth={1.5}
            />
            <Path d="M67 47 Q141 47 141 107 Q141 167 67 167 L67 47 Z" fill={BG_COLOR} />
          </AnimatedG>

          {renderFrontNodes()}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
