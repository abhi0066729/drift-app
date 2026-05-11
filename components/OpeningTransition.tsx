import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import Svg, { Path, Rect, G, Line, Circle } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');
const THEME_COLOR = '#e0dbd2';
const BG_COLOR = '#0e0e0e';

// ─── SVG DATA FROM HTML ───────────────────────────────────────
const FRONT_NODES = [
  { cx: 31,  cy: 27,  r: 6.5, fill: THEME_COLOR, inner: true, pair: 0 },
  { cx: 31,  cy: 27,  r: 3,   fill: BG_COLOR, inner: false, pair: 0 },
  { cx: 31,  cy: 187, r: 6.5, fill: THEME_COLOR, inner: true, pair: 1 },
  { cx: 31,  cy: 187, r: 3,   fill: BG_COLOR, inner: false, pair: 1 },
  { cx: 95,  cy: 27,  r: 5.5, fill: BG_COLOR, stroke: THEME_COLOR, pair: 2 },
  { cx: 95,  cy: 187, r: 5.5, fill: BG_COLOR, stroke: THEME_COLOR, pair: 3 },
  { cx: 171, cy: 107, r: 6.5, fill: THEME_COLOR, inner: true, pair: 4 },
  { cx: 171, cy: 107, r: 3,   fill: BG_COLOR, inner: false, pair: 4 }
];

const BRIDGES = [
  { x1: 31,  y1: 27,  x2: 45,  y2: 41,  op: 0.35 },
  { x1: 45,  y1: 41,  x2: 57,  y2: 53,  op: 0.22 },
  { x1: 95,  y1: 27,  x2: 109, y2: 41,  op: 0.32 },
  { x1: 109, y1: 41,  x2: 121, y2: 53,  op: 0.2 },
  { x1: 171, y1: 107, x2: 183, y2: 121, op: 0.32 },
  { x1: 183, y1: 121, x2: 195, y2: 133, op: 0.2 },
  { x1: 31,  y1: 187, x2: 57,  y2: 213, op: 0.28 },
  { x1: 95,  y1: 187, x2: 121, y2: 213, op: 0.25 }
];

export const OpeningTransition = ({ onComplete }: { onComplete: () => void }) => {
  const scatterAnim = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(0)).current;
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // START SEQUENCE
    Animated.sequence([
      // Phase 1: The Fracture (Explosion)
      Animated.timing(scatterAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.bezier(0.2, 0, 0.8, 1),
        useNativeDriver: true,
      }),
      // Phase 2: The Void Dive (Zoom through)
      Animated.timing(zoomAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      // Phase 3: Transition to Splash
      Animated.timing(fadeOutAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start(() => {
      onComplete();
    });
  }, []);

  const far = Math.max(W, H) * 2.5;
  const targetScale = Math.max(W, H) / 80;

  // ZOOM INTO THE VOID: The D slides away (RIGHT and DOWN)
  const zoomStyle = {
    transform: [
      { scale: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [1, targetScale] }) },
      { translateX: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.8] }) },
      { translateY: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.3] }) }
    ]
  };

  const renderFrontNodes = () => {
    const pairDirs = [
      {dx:-1.0,dy:-1.1,rot:-340},
      {dx:-1.0,dy: 1.1,rot: 310},
      {dx: 0.6,dy:-1.2,rot: 380},
      {dx: 0.6,dy: 1.2,rot:-360},
      {dx: 1.4,dy: 0.0,rot: 260},
    ];
    return FRONT_NODES.map((node, i) => {
      const dir = pairDirs[node.pair];
      return (
        <Animated.View key={i} style={{ 
          position: 'absolute',
          transform: [
            { translateX: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dir.dx * far] }) },
            { translateY: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dir.dy * far] }) },
            { rotate: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${dir.rot}deg`] }) }
          ],
          opacity: scatterAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] })
        }}>
          <Svg width={20} height={20} viewBox="0 0 20 20">
             <Circle cx={10} cy={10} r={node.r} fill={node.fill} stroke={node.stroke} strokeWidth={2} />
          </Svg>
        </Animated.View>
      );
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeOutAnim }]}>
      <Animated.View style={[styles.svgTray, zoomStyle]}>
        <Svg width={200} height={200} viewBox="0 0 270 270" style={{ overflow: 'visible' }}>
          {/* Background fractured box */}
          <G style={{ transform: [{rotate: scatterAnim.interpolate({inputRange:[0,1], outputRange:['0deg', '180deg']})}, {scale: scatterAnim.interpolate({inputRange:[0,1], outputRange:[1, 2]})}] } as any}>
            <Rect x={0} y={0} width={270} height={270} fill={BG_COLOR} stroke="#222" strokeWidth={3} opacity={scatterAnim.interpolate({inputRange:[0,1], outputRange:[1,0]})} />
          </G>

          {/* Layer 3 - Top Right fracture */}
          <G style={{ transform: [{ translateX: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, far*0.6] })}, { translateY: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, -far*0.5] })}, { rotate: scatterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg', '220deg'] })} ] } as any}>
            <Path d="M57 53 L57 213 L121 213 Q195 213 195 133 Q195 53 121 53 Z" fill="none" stroke={THEME_COLOR} strokeWidth={0.8} opacity={0.18} />
          </G>

          {/* Layer 2 - Left fracture */}
          <G style={{ transform: [{ translateX: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, -far*0.7] })}, { translateY: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, far*0.1] })}, { rotate: scatterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg', '-180deg'] })} ] } as any}>
            <Path d="M45 41 L45 201 L109 201 Q183 201 183 121 Q183 41 109 41 Z" fill="none" stroke={THEME_COLOR} strokeWidth={2} opacity={0.32} />
          </G>

          {/* Bridges - Snap upward */}
          <G style={{ opacity: scatterAnim.interpolate({inputRange:[0,0.5], outputRange:[1,0]}), transform: [{translateY: scatterAnim.interpolate({inputRange:[0,1], outputRange:[0, -far*0.3]})}] } as any}>
            {BRIDGES.map((b, i) => <Line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={THEME_COLOR} strokeWidth={0.9} opacity={b.op} />)}
          </G>

          {/* THE CORE D - Static during scatter, then zooms through */}
          <G>
            <Path d="M31 27 L31 187 L95 187 Q171 187 171 107 Q171 27 95 27 Z" fill={THEME_COLOR} />
            <Path d="M31 27 L67 27 L67 187 L31 187 Z" fill={BG_COLOR} />
            <Path d="M67 47 Q141 47 141 107 Q141 167 67 167 L67 47 Z" fill={BG_COLOR} />
          </G>
        </Svg>

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
           {renderFrontNodes()}
        </View>
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
  },
  svgTray: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  }
});
