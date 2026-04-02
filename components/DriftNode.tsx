import React, { useEffect, memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_COLORS } from '@/constants/Categories';
import * as Haptics from 'expo-haptics';

interface DriftNodeProps {
  node: any;
  onPress: (node: any, type: 'dot' | 'text') => void;
  activeView: 'chronos' | 'nexus';
  searchStatus?: 'match' | 'dim' | 'none';
  isFirst?: boolean;
}

function DriftNode({ node, onPress, activeView, searchStatus = 'none', isFirst }: DriftNodeProps) {
  const localYBase = node.unfocusedY - 60;
  const color = CATEGORY_COLORS[node.category] || '#111111';
  
  // Reanimated pulse for ghost nodes
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const outerPulseScale = useSharedValue(1);
  const outerPulseOpacity = useSharedValue(0.1);
  
  // Search Highlighting Pulse
  const searchPulseScale = useSharedValue(1);
  const searchPulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (searchStatus === 'match') {
      searchPulseScale.value = withRepeat(
        withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      searchPulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1, false
      );
    } else {
      searchPulseScale.value = withTiming(1);
      searchPulseOpacity.value = withTiming(0);
    }
  }, [searchStatus]);

  useEffect(() => {
    // Only pulse the very first node or ghost nodes to save CPU on 2000+ items
    if (node.is_ghost || isFirst) {
      pulseScale.value = withRepeat(
        withTiming(2.2, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      outerPulseScale.value = withRepeat(
        withTiming(3.0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      outerPulseOpacity.value = withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1, false
      );
    } else {
      // Static state for performance on standard nodes
      pulseScale.value = 1;
      pulseOpacity.value = 0.2;
      outerPulseScale.value = 1;
      outerPulseOpacity.value = 0.05;
    }
  }, [node.is_ghost, isFirst]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const searchPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchPulseScale.value }],
    opacity: searchPulseOpacity.value,
  }));

  const outerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerPulseScale.value }],
    opacity: outerPulseOpacity.value,
  }));

  // Horizon Math
  const importanceScore = Math.min(1, Math.max(0, (node.content.length - 15) / 150));
  
  const containerStyle = useAnimatedStyle(() => {
    const isNexus = activeView === 'nexus';
    let targetScale = isNexus ? 0.75 + (importanceScore * 0.6) : 1.0;
    let targetOpacity = isNexus ? 0.25 + (importanceScore * 0.75) : 1.0;
    
    // Search Visibility Overrides
    if (searchStatus === 'dim') {
      targetOpacity = 0.05;
      targetScale = 0.95;
    } else if (searchStatus === 'match') {
      targetOpacity = 1.0;
      targetScale = 1.1; // Pop out slightly
    }

    return {
      transform: [{ scale: withSpring(targetScale, { damping: 20, stiffness: 90 }) }],
      opacity: withTiming(targetOpacity, { duration: 400, easing: Easing.out(Easing.cubic) }),
      top: withSpring(localYBase, { damping: 25, stiffness: 60 }),
      zIndex: searchStatus === 'match' ? 100 : (activeView === 'nexus' && importanceScore > 0.5 ? 20 : 2),
    };
  }, [activeView, importanceScore, searchStatus, localYBase]);

  const handleDotPress = () => {
    try { Haptics.selectionAsync(); } catch (e) {}
    onPress(node, 'dot');
  };

  const handleTextPress = () => {
    try { Haptics.selectionAsync(); } catch (e) {}
    onPress(node, 'text');
  };

  return (
    <Animated.View style={[{ position: 'absolute', width: '100%' }, containerStyle]}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 60 - node.nodeRadius * 4, left: node.unfocusedX - node.nodeRadius * 4, width: node.nodeRadius * 8, height: node.nodeRadius * 8, justifyContent: 'center', alignItems: 'center', zIndex: 20 }}
        activeOpacity={1}
        onPress={handleDotPress}
      >
        <Animated.View style={[{ position: 'absolute', width: node.nodeRadius * 5, height: node.nodeRadius * 5, borderRadius: node.nodeRadius * 2.5, backgroundColor: color }, searchPulseStyle]} />
        <Animated.View style={[{ position: 'absolute', width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, backgroundColor: color }, outerPulseStyle]} />
        <Animated.View style={[{ position: 'absolute', width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, backgroundColor: color }, pulseStyle]} />
        <View pointerEvents="none" style={{ width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, backgroundColor: color, opacity: node.is_refining ? 0.3 : node.ageFade + 0.2 }} />
        {node.is_refining && (
          <View style={{ position: 'absolute', width: node.nodeRadius * 4, height: node.nodeRadius * 4, borderRadius: node.nodeRadius * 2, borderWidth: 1, borderColor: color, opacity: 0.5 }} />
        )}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{ zIndex: 10, marginLeft: node.unfocusedTextLeft, width: node.dynamicWidth, paddingTop: 30, paddingBottom: 30, justifyContent: 'center' }} 
        activeOpacity={1.0} 
        onPress={handleTextPress}
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

export default memo(DriftNode, (prev, next) => {
  return (
    prev.node.id === next.node.id &&
    prev.node.unfocusedY === next.node.unfocusedY &&
    prev.node.unfocusedX === next.node.unfocusedX &&
    prev.activeView === next.activeView &&
    prev.searchStatus === next.searchStatus &&
    prev.isFirst === next.isFirst
  );
});

const styles = StyleSheet.create({
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 18, fontWeight: '300', lineHeight: 28, color: '#111111' },
});
