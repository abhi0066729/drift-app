import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated, Easing,
  Platform, useColorScheme
} from 'react-native';
import Svg, { Path, Circle, Rect, G, Line, Defs, ClipPath } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── LOADING TIPS ─────────────────────────────────────────────
const TIPS = [
  'Calculating the weight of your dreams...',
  'Polishing the stardust...',
  'Whispering to the Llama...',
  'Weaving constellations from your thoughts...',
  'Dusting off the galactic map...',
  'Checking the resonance of your memories...',
  'Inflating the nebula clouds...',
  'Synthesizing pure inspiration...',
  'Herding the stray ideas...',
  'Aligning the stars in your favor...',
  'Brewing neural espresso...',
  'Consulting the digital oracle...',
  'Unfolding the spatial void...',
  'Synchronizing your subconscious...',
  'Polishing the temporal lens...',
  'Gathering fragments of tomorrow...',
  'Navigating the semantic drift...',
  'Waking up the local intelligence...',
  'Painting the void with logic...',
  'Counting the ripples in the memory stream...',
];

const THEME_COLOR = '#e0dbd2';
const BG_COLOR = '#0e0e0e';

// Re-creating the individual elements from the HTML for granular control
const FRONT_NODES = [
  { cx: 31, cy: 27, pair: 0 }, { cx: 31, cy: 27, pair: 0 },
  { cx: 31, cy: 187, pair: 1 }, { cx: 31, cy: 187, pair: 1 },
  { cx: 95, cy: 27, pair: 2 }, { cx: 95, cy: 187, pair: 3 },
  { cx: 171, cy: 107, pair: 4 }, { cx: 171, cy: 107, pair: 4 }
];

const BRIDGES = [
  { x1: 31, y1: 27, x2: 45, y2: 41, op: 0.35 },
  { x1: 95, y1: 27, x2: 109, y2: 41, op: 0.32 },
  { x1: 171, y1: 107, x2: 183, y2: 121, op: 0.32 },
  { x1: 31, y1: 187, x2: 57, y2: 213, op: 0.28 }
];

export const BrandedSplashScreen = ({ phase }: { phase: string }) => {
  const scatterAnim = useRef(new Animated.Value(0)).current; 
  const zoomAnim = useRef(new Animated.Value(0)).current;    
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const [tipIdx, setTipIdx] = useState(Math.floor(Math.random() * TIPS.length));
  const tipFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // RESET & START
    scatterAnim.setValue(0);
    zoomAnim.setValue(0);

    // Sequence for Triple Layer Reveal
    Animated.sequence([
      // Phase 1: Fracture and Scatter
      Animated.timing(scatterAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.bezier(0.2, 0, 0.8, 1),
        useNativeDriver: true,
      }),
      // Phase 2: Zoom through into the VOID (Right-Offset)
      Animated.timing(zoomAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      })
    ]).start();

    // Wordmark & Tip Reveal
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(tipFade, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]).start();
    }, 2200);

    const tipInterval = setInterval(() => {
      Animated.timing(tipFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setTipIdx(prev => (prev + 1) % TIPS.length);
        Animated.timing(tipFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 3000);

    return () => clearInterval(tipInterval);
  }, []);

  const far = Math.max(W, H) * 2.2; // Even more extensive scatter
  const targetScale = (Math.max(W, H) / 90) * 1.5;

  // Zoom Tray: Slides RIGHT to zoom into the black space (the center-left void of the D)
  const trayStyle = {
    transform: [
      { scale: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [1, targetScale] }) },
      { translateX: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.4] }) },
      { translateY: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.1] }) }
    ],
    opacity: zoomAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }) // Fade out at the end of zoom
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
      const animStyle = {
        transform: [
          { translateX: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dir.dx * far] }) },
          { translateY: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, dir.dy * far] }) },
          { rotate: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${dir.rot}deg`] }) }
        ],
        opacity: scatterAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.6, 0] })
      };

      return (
        <G key={i} style={animStyle as any}>
          <Circle cx={node.cx} cy={node.cy} r={i % 2 === 0 ? 6.5 : 3} fill={i % 2 === 0 ? THEME_COLOR : BG_COLOR} />
        </G>
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* BACKGROUND STAR FIELD (already there, revealed by zoom) */}
      <View style={StyleSheet.absoluteFill}>
         <Animated.View style={[styles.starsContainer, { opacity: zoomAnim }]}>
           {/* Simulate the splash star field behind the zoom */}
           {[...Array(40)].map((_, i) => (
             <View key={i} style={[styles.star, { top: Math.random()*H, left: Math.random()*W, opacity: 0.2 + Math.random()*0.4 }]} />
           ))}
         </Animated.View>
      </View>

      <Animated.View style={[styles.tray, trayStyle]}>
        <Svg width={200} height={200} viewBox="0 0 270 270" style={{ overflow: 'visible' }}>
          {/* BG Box - Fractures and Fades */}
          <G style={{ transform: [{rotate: scatterAnim.interpolate({inputRange:[0,1], outputRange:['0deg', '180deg']})}, {scale: scatterAnim.interpolate({inputRange:[0,1], outputRange:[1, 2.5]})}] } as any}>
             <Rect x={0} y={0} width={270} height={270} fill={BG_COLOR} stroke="#222" strokeWidth={3} opacity={scatterAnim.interpolate({inputRange:[0,1], outputRange:[1,0]})} />
          </G>

          {/* Layer 3 - Spins CW, flies top-right */}
          <G style={{ transform: [{ translateX: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, far*0.6] })}, { translateY: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, -far*0.5] })}, { rotate: scatterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg', '220deg'] })} ] } as any}>
            <Path d="M57 53 L57 213 L121 213 Q195 213 195 133 Q195 53 121 53 Z" fill="none" stroke={THEME_COLOR} strokeWidth={0.8} opacity={0.18} />
          </G>

          {/* Layer 2 - Spins CCW, flies left */}
          <G style={{ transform: [{ translateX: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, -far*0.7] })}, { translateY: scatterAnim.interpolate({ inputRange:[0,1], outputRange:[0, far*0.1] })}, { rotate: scatterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg', '-180deg'] })} ] } as any}>
            <Path d="M45 41 L45 201 L109 201 Q183 201 183 121 Q183 41 109 41 Z" fill="none" stroke={THEME_COLOR} strokeWidth={2} opacity={0.32} />
          </G>

          {/* Bridges - Explode upward */}
          <G fill="none" stroke={THEME_COLOR} strokeWidth={0.9} style={{ opacity: scatterAnim.interpolate({inputRange:[0,0.5], outputRange:[1,0]}), transform: [{translateY: scatterAnim.interpolate({inputRange:[0,1], outputRange:[0, -100]})}] } as any}>
            {BRIDGES.map((b, i) => <Line key={i} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} opacity={b.op} />)}
          </G>

          {/* LAYER 1 - The Core D (Zooms through) */}
          <G>
            <Path d="M31 27 L31 187 L95 187 Q171 187 171 107 Q171 27 95 27 Z" fill={THEME_COLOR} />
            <Path d="M31 27 L67 27 L67 187 L31 187 Z" fill={BG_COLOR} />
            <Path d="M67 47 Q141 47 141 107 Q141 167 67 167 L67 47 Z" fill={BG_COLOR} />
          </G>

          {renderFrontNodes()}
        </Svg>
      </Animated.View>

      <View style={styles.footer}>
        <Animated.View style={{ opacity: wordmarkOpacity }}>
          <Text style={styles.wordmark}>drift</Text>
        </Animated.View>
        <Animated.View style={{ opacity: tipFade, marginTop: 16 }}>
          <Text style={styles.tipText}>{TIPS[tipIdx]}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR, alignItems: 'center', justifyContent: 'center' },
  tray: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: '15%', alignItems: 'center', width: '100%' },
  wordmark: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 16, letterSpacing: 12, color: THEME_COLOR,
    textTransform: 'uppercase', fontWeight: '300'
  },
  tipText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9, color: THEME_COLOR, textAlign: 'center',
    letterSpacing: 2, opacity: 0.5, textTransform: 'uppercase', paddingHorizontal: 40
  },
  starsContainer: { flex: 1 },
  star: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: THEME_COLOR }
});
