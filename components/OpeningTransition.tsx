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

export const OpeningTransition = ({ onComplete }: { onComplete: () => void }) => {
  const scatter = useRef(new Animated.Value(0)).current; // Phase 1: Explosion
  const zoom = useRef(new Animated.Value(0)).current;    // Phase 2: Snap & Zoom
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // PHASE 1: EXPLODE (Match HTML timing: ~1.1s)
    Animated.timing(scatter, {
      toValue: 1,
      duration: 1100,
      easing: Easing.bezier(0.2, 0, 0.8, 1),
      useNativeDriver: true,
    }).start();

    // PHASE 2: SNAP & ZOOM (Match HTML setTimeout: 460ms)
    setTimeout(() => {
      Animated.timing(zoom, {
        toValue: 1,
        duration: 850,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start(() => {
        // Final fade into Splash
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(onComplete);
      });
    }, 460);
  }, []);

  const far = Math.max(W, H) * 1.6;
  const targetScale = (Math.max(W, H) / 90) * 0.72;

  const renderFrontNodes = () => {
    const pairDirs = [
      {dx:-1.0, dy:-1.1, rot: -340},
      {dx:-1.0, dy: 1.1, rot: 310},
      {dx: 0.6, dy:-1.2, rot: 380},
      {dx: 0.6, dy: 1.2, rot:-360},
      {dx: 1.4, dy: 0.0, rot: 260},
    ];
    
    const nodePairs = [
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
          opacity={scatter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }) as any}
          transform={[
            { translateX: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, dx * far] }) },
            { translateY: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, dy * far] }) },
            { rotate: scatter.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rot}deg`] }) }
          ] as any}
        />
      ));
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <Animated.View style={{
        transform: [
          { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, targetScale] }) },
          // VOID ZOOM: Offset to right/down so we zoom into the D's center-left blank space
          { translateX: zoom.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.45] }) },
          { translateY: zoom.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.15] }) }
        ] as any
      }}>
        <Svg width={270} height={270} viewBox="0 0 270 270" style={{ overflow: 'visible' }}>
          <AnimatedRect 
            x={0} y={0} width={270} height={270} fill={BG_COLOR} stroke="#222" strokeWidth={3}
            opacity={scatter.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) as any}
            transform={[
              { rotate: scatter.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
              { scale: scatter.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }
            ] as any}
          />

          <AnimatedRect 
            x={0} y={0} width={270} height={5} fill={THEME_COLOR}
            transform={[{ translateY: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, -far] }) }] as any}
          />

          <AnimatedPath 
            d="M57 53 L57 213 L121 213 Q195 213 195 133 Q195 53 121 53 Z" fill="none" stroke={THEME_COLOR} strokeWidth={0.8}
            opacity={0.18}
            transform={[
              { translateX: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, far * 0.6] }) },
              { translateY: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, -far * 0.5] }) },
              { rotate: scatter.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '220deg'] }) }
            ] as any}
          />

          <AnimatedPath 
            d="M45 41 L45 201 L109 201 Q183 201 183 121 Q183 41 109 41 Z" fill="none" stroke={THEME_COLOR} strokeWidth={2}
            opacity={0.32}
            transform={[
              { translateX: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, -far * 0.7] }) },
              { translateY: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, far * 0.1] }) },
              { rotate: scatter.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] }) }
            ] as any}
          />

          <AnimatedG 
            opacity={scatter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }) as any}
            transform={[
              { scaleY: scatter.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) },
              { translateY: scatter.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }
            ] as any}
          >
            <Line x1="31" y1="27" x2="45" y2="41" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.35} />
            <Line x1="95" y1="27" x2="109" y2="41" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.32} />
            <Line x1="171" y1="107" x2="183" y2="121" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.32} />
            <Line x1="31" y1="187" x2="57" y2="213" stroke={THEME_COLOR} strokeWidth={0.9} opacity={0.28} />
          </AnimatedG>

          <AnimatedG transform={[{ rotate: zoom.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) }, { scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] as any}>
            <Path d="M31 27 L31 187 L95 187 Q171 187 171 107 Q171 27 95 27 Z" fill={THEME_COLOR} />
            <Path d="M31 27 L67 27 L67 187 L31 187 Z" fill={BG_COLOR} />
            <Path d="M67 47 Q141 47 141 107 Q141 167 67 167 L67 47 Z" fill={BG_COLOR} />
          </AnimatedG>
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
