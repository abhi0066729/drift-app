import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CATEGORY_COLORS } from '@/constants/Categories';

interface NexusSummaryGlass {
  id: string;
  category: string;
  center: { x: number, y: number };
  activeView: 'chronos' | 'nexus';
}

const NexusSummaryGlass = ({ category, center, activeView }: NexusSummaryGlass) => {
  const color = CATEGORY_COLORS[category] || '#8E44AD';

  const animatedStyle = useAnimatedStyle(() => {
    const scale = activeView === 'nexus' ? withSpring(1) : withSpring(0.6);
    const opacity = activeView === 'nexus' ? withSpring(0.95) : withSpring(0);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View 
      pointerEvents="none"
      style={[
        styles.container, 
        { top: center.y - 20, left: center.x - 60 },
        animatedStyle
      ]}
    >
      <BlurView intensity={30} tint="light" style={styles.blur}>
        <View style={[styles.indicator, { backgroundColor: color }]} />
        <Text style={[styles.text, { color: '#000' }]}>{category.toUpperCase()}</Text>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 120,
    height: 36,
    zIndex: 50,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  blur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  }
});

export default memo(NexusSummaryGlass);
