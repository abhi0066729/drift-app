import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_COLORS } from '@/constants/Categories';

interface DriftNodeProps {
  node: any;
  onPress: (node: any) => void;
  activeView: 'chronos' | 'nexus';
}

export default function DriftNode({ node, onPress, activeView }: DriftNodeProps) {
  const localYBase = node.unfocusedY - 60;
  const color = CATEGORY_COLORS[node.category] || '#111111';
  
  // Reanimated pulse for ghost nodes
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  
  useEffect(() => {
    if (node.is_ghost) {
      pulseScale.value = withRepeat(
        withTiming(2.2, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1, false
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 0;
    }
  }, [node.is_ghost]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Horizon Math
  const importanceScore = Math.min(1, Math.max(0, (node.content.length - 15) / 150));
  
  const containerStyle = useAnimatedStyle(() => {
    const isNexus = activeView === 'nexus';
    const targetScale = isNexus ? 0.75 + (importanceScore * 0.6) : 1.0;
    const targetOpacity = isNexus ? 0.25 + (importanceScore * 0.75) : 1.0;
    
    return {
      transform: [{ scale: withSpring(targetScale, { damping: 20, stiffness: 90 }) }],
      opacity: withTiming(targetOpacity, { duration: 600, easing: Easing.out(Easing.cubic) }),
    };
  }, [activeView, importanceScore]);

  const handlePress = () => onPress(node);

  return (
    <Animated.View style={[{ position: 'absolute', width: '100%', top: localYBase, zIndex: activeView === 'nexus' && importanceScore > 0.5 ? 20 : 2 }, containerStyle]}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 60 - node.nodeRadius * 4, left: node.unfocusedX - node.nodeRadius * 4, width: node.nodeRadius * 8, height: node.nodeRadius * 8, justifyContent: 'center', alignItems: 'center', zIndex: 20 }}
        activeOpacity={1}
        onPress={handlePress}
      >
        {node.is_ghost && (
          <Animated.View style={[{ position: 'absolute', width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, backgroundColor: color }, pulseStyle]} />
        )}
        <View pointerEvents="none" style={{ width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, backgroundColor: color, opacity: node.is_refining ? 0.3 : node.ageFade + 0.2 }} />
        {node.is_refining && (
          <View style={{ position: 'absolute', width: node.nodeRadius * 4, height: node.nodeRadius * 4, borderRadius: node.nodeRadius * 2, borderWidth: 1, borderColor: color, opacity: 0.5 }} />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{ zIndex: 10, marginLeft: node.unfocusedTextLeft, width: node.dynamicWidth, paddingTop: 30, paddingBottom: 30, justifyContent: 'center' }} 
        activeOpacity={1.0} 
        onPress={handlePress}
      >
        <Text style={[styles.noteCategory, { color, marginBottom: 6, opacity: Math.min(1, node.ageFade + 0.4) }]}>
          {node.is_refining ? 'REFINING...' : node.category?.toUpperCase()}
        </Text>
        <View style={{ maxHeight: 60, overflow: 'hidden' }}>
          <Text numberOfLines={3} style={[styles.noteContent, node.is_refining && { color: '#BBBBBB' }]}>{node.content}</Text>
          {(node.content.length > 80 || node.displayLines > 2) && (
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28 }}
              pointerEvents="none"
            />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 18, fontWeight: '300', lineHeight: 28, color: '#111111' },
});
