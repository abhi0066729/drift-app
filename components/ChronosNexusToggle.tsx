import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ViewToggleProps {
  activeView: 'chronos' | 'nexus';
  onToggle: (view: 'chronos' | 'nexus') => void;
}

export default function ChronosNexusToggle({ activeView, onToggle }: ViewToggleProps) {
  const togglePos = useSharedValue(activeView === 'chronos' ? 0 : 1);
  const pulseTranslation = useSharedValue(activeView === 'chronos' ? 0 : 80);
  const pulseScale = useSharedValue(0);
  const waveAmplitude = useSharedValue(0);
  const randomWaveY = useSharedValue(0);

  const handlePress = (view: 'chronos' | 'nexus') => {
    if (activeView === view) return;
    
    const randomHeight = (Math.random() * 40 + 30) * (Math.random() > 0.5 ? 1 : -1);
    randomWaveY.value = randomHeight;

    const targetPos = view === 'chronos' ? 0 : 80;
    
    waveAmplitude.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
      withSpring(0, { damping: 3, stiffness: 200 })
    );

    pulseScale.value = withTiming(1, { duration: 100 }, () => {
      pulseTranslation.value = withTiming(targetPos, { duration: 350, easing: Easing.inOut(Easing.ease) }, () => {
        pulseScale.value = withTiming(0, { duration: 100 });
      });
    });

    togglePos.value = withSpring(view === 'chronos' ? 0 : 1, { damping: 14, stiffness: 200 });
    onToggle(view);
  };

  const chronosStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(togglePos.value === 0 ? 1 : 0.6) }],
    opacity: withTiming(togglePos.value === 0 ? 1 : 0.3),
  }));

  const nexusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(togglePos.value === 1 ? 1 : 0.6) }],
    opacity: withTiming(togglePos.value === 1 ? 1 : 0.3),
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pulseTranslation.value }, { scale: pulseScale.value }],
    opacity: pulseScale.value,
  }));

  const animatedProps = useAnimatedProps(() => {
    const cpY = 45 + (waveAmplitude.value * randomWaveY.value);
    return { d: `M 0 45 Q 40 ${cpY}, 80 45` };
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
      <TouchableOpacity onPress={() => handlePress('chronos')} style={{ alignItems: 'center', padding: 8 }} activeOpacity={1}>
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2.0, marginBottom: 8, color: activeView === 'chronos' ? '#111' : '#AAA' }}>CHRONOS</Text>
        <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#111111', borderWidth: 1, borderColor: '#111111' }, chronosStyle]} />
      </TouchableOpacity>

      <View style={{ width: 80, height: 90, justifyContent: 'center' }}>
        <Svg width="80" height="90" style={{ position: 'absolute' }}>
          <AnimatedPath animatedProps={animatedProps} stroke="#E0E0E0" strokeWidth="1.5" fill="none" />
        </Svg>
        <Animated.View style={[{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#8E44AD', top: 41, left: -4 }, indicatorStyle]} />
      </View>

      <TouchableOpacity onPress={() => handlePress('nexus')} style={{ alignItems: 'center', padding: 8 }} activeOpacity={1}>
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2.0, marginBottom: 8, color: activeView === 'nexus' ? '#8E44AD' : '#AAA' }}>NEXUS</Text>
        <Animated.View style={[{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#8E44AD' }, nexusStyle]} />
      </TouchableOpacity>
    </View>
  );
}
