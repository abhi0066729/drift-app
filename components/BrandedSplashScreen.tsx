import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated, Easing,
  useColorScheme, Platform
} from 'react-native';
import Svg, { Path, Circle, Rect, G, Line, Defs, ClipPath } from 'react-native-svg';
import { BlurView } from 'expo-blur';

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

// ─── STYLES ───────────────────────────────────────────────────
const THEME_COLOR = '#e0dbd2';
const BG_COLOR = '#0e0e0e';

export const BrandedSplashScreen = ({ phase }: { phase: string }) => {
  const isDark = useColorScheme() === 'dark';
  
  // Reanimated / Animated values for the "Triple Layer" logic
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const scatterAnim = useRef(new Animated.Value(0)).current; // 0 -> 1 for Phase 1 (Explosion)
  const zoomAnim = useRef(new Animated.Value(0)).current;    // 0 -> 1 for Phase 2 (Zoom into D)
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkY = useRef(new Animated.Value(12)).current;

  const [tipIdx, setTipIdx] = useState(Math.floor(Math.random() * TIPS.length));
  const tipFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // START ANIMATION SEQUENCE
    // PHASE 1: Explode outward
    Animated.timing(scatterAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();

    // PHASE 2: Zoom and Wordmark
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(zoomAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(600),
          Animated.parallel([
            Animated.timing(wordmarkOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(wordmarkY, { toValue: 0, duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
            Animated.timing(tipFade, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        ])
      ]).start();
    }, 450);

    // Tip rotation
    const tipInterval = setInterval(() => {
      Animated.timing(tipFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setTipIdx(prev => (prev + 1) % TIPS.length);
        Animated.timing(tipFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 3000);

    return () => clearInterval(tipInterval);
  }, []);

  // DERIVED ANIMATED STYLES
  const far = Math.max(W, H) * 1.6;

  // Background rect logic (layer 3 spins CW, flies top-right)
  const layer3Style = {
    opacity: 0.18,
    transform: [
      { translateX: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, far * 0.6] }) },
      { translateY: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -far * 0.5] }) },
      { rotate: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '220deg'] }) }
    ]
  };

  // layer 2 spins CCW, flies left
  const layer2Style = {
    opacity: 0.32,
    transform: [
      { translateX: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -far * 0.7] }) },
      { translateY: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, far * 0.1] }) },
      { rotate: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] }) }
    ]
  };

  // bridges stretch and snap upward
  const bridgesStyle = {
    opacity: scatterAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.5, 0] }),
    transform: [
      { scaleY: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) },
      { translateY: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }
    ]
  };

  // Zoomed SVG container
  const targetScale = Math.max(W, H) / 90;
  const svgContainerStyle = {
    transform: [
      { scale: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [1, targetScale * 0.72] }) }
    ]
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.svgWrapper, svgContainerStyle]}>
        <Svg width={200} height={200} viewBox="0 0 270 270" style={{ overflow: 'visible' }}>
          <Defs>
            <ClipPath id="box"><Rect x="0" y="0" width="270" height="270"/></ClipPath>
          </Defs>

          {/* BG */}
          <Animated.View style={{ opacity: scatterAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{rotate: scatterAnim.interpolate({inputRange:[0,1], outputRange:['0deg', '180deg']})}, {scale: scatterAnim.interpolate({inputRange:[0,1], outputRange:[1, 1.8]})}] }}>
             <Rect x={0} y={0} width={270} height={270} fill={BG_COLOR} stroke="#222" strokeWidth={3} />
          </Animated.View>

          {/* Layer 3 */}
          <G style={layer3Style as any}>
            <Path d="M57 53 L57 213 L121 213 Q195 213 195 133 Q195 53 121 53 Z" fill="none" stroke={THEME_COLOR} strokeWidth={0.8} />
            <Path d="M57 53 L91 53 L91 213 L57 213" fill="none" stroke={THEME_COLOR} strokeWidth={0.8} />
          </G>

          {/* Layer 2 */}
          <G style={layer2Style as any}>
            <Path d="M45 41 L45 201 L109 201 Q183 201 183 121 Q183 41 109 41 Z" fill="none" stroke={THEME_COLOR} strokeWidth={2} />
            <Path d="M45 41 L79 41 L79 201 L45 201" fill="none" stroke={THEME_COLOR} strokeWidth={2} />
          </G>

          {/* Layer 1 (Main D) */}
          <G>
            <Path d="M31 27 L31 187 L95 187 Q171 187 171 107 Q171 27 95 27 Z" fill={THEME_COLOR} />
            <Path d="M31 27 L67 27 L67 187 L31 187 Z" fill={BG_COLOR} />
            <Path d="M67 47 Q141 47 141 107 Q141 167 67 167 L67 47 Z" fill={BG_COLOR} />
          </G>

          {/* Bridges */}
          <G style={bridgesStyle as any} stroke={THEME_COLOR} strokeWidth={0.9} fill="none">
             <Line x1="31" y1="27"  x2="45" y2="41" opacity={0.35} />
             <Line x1="95" y1="27"  x2="109" y2="41" opacity={0.32} />
             <Line x1="171" y1="107" x2="183" y2="121" opacity={0.32} />
             <Line x1="31" y1="187" x2="57" y2="213" opacity={0.28} />
          </G>
        </Svg>
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={[styles.wordmarkContainer, { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkY }] }]}>
          <Text style={styles.wordmark}>drift</Text>
        </Animated.View>

        <Animated.View style={[styles.tipContainer, { opacity: tipFade }]}>
           <Text style={styles.tipText}>{TIPS[tipIdx]}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'absolute',
    bottom: '30%',
    alignItems: 'center',
    width: '100%',
  },
  wordmarkContainer: {
    marginBottom: 20,
  },
  wordmark: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    letterSpacing: 10,
    color: THEME_COLOR,
    textTransform: 'uppercase',
    fontWeight: '300',
  },
  tipContainer: {
    paddingHorizontal: 40,
    marginTop: 20,
  },
  tipText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    color: THEME_COLOR,
    textAlign: 'center',
    letterSpacing: 1.5,
    opacity: 0.6,
    textTransform: 'uppercase',
  }
});
