import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import Svg, { Path, Rect, G, Line, Circle } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');
const THEME_COLOR = '#e0dbd2';
const BG_COLOR = '#0e0e0e';

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
  const main = useRef(new Animated.Value(0)).current; // Unified animation value for synchronized start
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // SYNCHRONIZED START: All elements move together, slightly slower pace
    Animated.timing(main, {
      toValue: 1,
      duration: 1800, // Slower, more cinematic (increased from 1100ms/850ms)
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      // Final fade into Splash
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(onComplete);
    });
  }, []);

  const far = Math.max(W, H) * 1.8;
  const targetScale = (Math.max(W, H) / 90) * 0.75;

  const renderFrontNodes = () => {
    const pairDirs = [
      {dx:-1.0, dy:-1.1, rot: -340},
      {dx:-1.0, dy: 1.1, rot: 310},
      {dx: 0.6, dy:-1.2, rot: 380},
      {dx: 0.6, dy: 1.2, rot:-360},
      {dx: 1.4, dy: 0.0, rot: 260},
    ];
    
    const nodePairs: NodeData[][] = [
      [{cx: 31, cy: 27, r: 6.5, f: THEME_COLOR}, {cx: 31, cy: 27, r: 3, f: BG_COLOR}],
      [{cx: 31, cy: 187, r: 6.5, f: THEME_COLOR}, {cx: 31, cy: 187, r: 3, f: BG_COLOR}],
      [{cx: 95, cy: 27, r: 5.5, s: THEME_COLOR, sw: 2.5}],
      [{cx: 95, cy: 187, r: 5.5, s: THEME_COLOR, sw: 2.5}],
      [{cx: 171, cy: 107, r: 6.5, f: THEME_COLOR}, {cx: 171, cy: 107, r: 3, f: BG_COLOR}]
    ];

    return nodePairs.map((pair, i) => {
      const {dx, dy, rot} = pairDirs[i];
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
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <Animated.View style={{
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
            x={0} y={0} width={270} height={270} fill={BG_COLOR} stroke="#222" strokeWidth={3}
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

          {/* THE CORE D - Rotates while diving */}
          <AnimatedG transform={[
            { rotate: main.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-25deg'] }) },
            { scale: main.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }
          ] as any}>
            <Path d="M31 27 L31 187 L95 187 Q171 187 171 107 Q171 27 95 27 Z" fill={THEME_COLOR} />
            <Path d="M31 27 L67 27 L67 187 L31 187 Z" fill={BG_COLOR} />
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
    backgroundColor: BG_COLOR,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
