import React, { useEffect, memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { NightTheme } from '@/constants/theme';
import { useNotesStore } from '@/store/useNotesStore';
import * as Haptics from 'expo-haptics';

interface DriftNodeProps {
  node: any;
  onPress: (node: any, type: 'dot' | 'text') => void;
  activeView: 'chronos' | 'nexus';
  searchStatus?: 'match' | 'dim' | 'none';
  isFirst?: boolean;
}

function DriftNode({ node, onPress, activeView, searchStatus = 'none', isFirst }: DriftNodeProps) {
  const theme = useNotesStore(state => state.theme);
  const localYBase = node.unfocusedY - 60;
  const isRefining = node.is_refining;
  const resonancesObj = node.resonances || { [node.category]: 1.0 };
  const sortedResonances = Object.entries(resonancesObj).sort((a: any, b: any) => (b[1] as number) - (a[1] as number));
  const primaryCat = sortedResonances[0]?.[0] || node.category;
  const secondaryCat = sortedResonances.length > 1 && (sortedResonances[1][1] as number) > 0.2 ? sortedResonances[1][0] : primaryCat;
  
  const color1 = isRefining ? '#4A90E2' : (CATEGORY_COLORS[primaryCat] || '#111111');
  const color2 = isRefining ? '#9013FE' : (CATEGORY_COLORS[secondaryCat] || color1);
  const mainColor = color1;
  const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
  
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const outerPulseScale = useSharedValue(1);
  const outerPulseOpacity = useSharedValue(0.1);
  
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
    if (node.is_ghost || isFirst || isRefining) {
      pulseScale.value = withRepeat(
        withTiming(isRefining ? 1.8 : 2.2, { duration: isRefining ? 800 : 1500, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: isRefining ? 800 : 1500, easing: Easing.out(Easing.ease) }),
        -1, false
      );
      
      if (!isRefining) {
        outerPulseScale.value = withRepeat(
          withTiming(3.0, { duration: 2000, easing: Easing.out(Easing.ease) }),
          -1, false
        );
        outerPulseOpacity.value = withRepeat(
          withTiming(0, { duration: 2000, easing: Easing.out(Easing.ease) }),
          -1, false
        );
      } else {
        outerPulseScale.value = 1;
        outerPulseOpacity.value = 0;
      }
    } else {
      pulseScale.value = 1; pulseOpacity.value = 0.2;
      outerPulseScale.value = 1; outerPulseOpacity.value = 0.05;
    }
  }, [node.is_ghost, isFirst, isRefining]);

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

  const importanceScore = Math.min(1, Math.max(0, (node.content.length - 15) / 150));
  
  const containerStyle = useAnimatedStyle(() => {
    const isNexus = activeView === 'nexus';
    const isPurpleNode = mainColor === '#8E44AD';
    let targetOpacity = isNexus ? 0.25 + (importanceScore * 0.75) : 0.9;
    if (searchStatus === 'dim') targetOpacity = 0.05;
    else if (searchStatus === 'match') targetOpacity = 1.0;

    return {
      opacity: withTiming(targetOpacity, { duration: 400, easing: Easing.out(Easing.cubic) }),
      top: withSpring(localYBase, { damping: 25, stiffness: 60 }),
      zIndex: searchStatus === 'match' ? 100 : (activeView === 'nexus' && (importanceScore > 0.5 || isPurpleNode) ? 20 : 2),
    };
  }, [activeView, importanceScore, searchStatus, localYBase, mainColor]);

  const innerContentStyle = useAnimatedStyle(() => {
    const isNexus = activeView === 'nexus';
    const isChronos = activeView === 'chronos';
    const isBlackNode = mainColor === '#111111';
    const isPurpleNode = mainColor === '#8E44AD';
    
    let viewMultiplier = 1.0;
    if (isChronos && isBlackNode) viewMultiplier = 1.05; 
    if (isNexus && isPurpleNode) viewMultiplier = 1.1; 
    
    let targetScale = (isNexus ? 0.6 + (importanceScore * 0.5) : 0.85) * viewMultiplier;
    if (searchStatus === 'dim') targetScale = targetScale * 0.8;
    else if (searchStatus === 'match') targetScale = targetScale * 1.15;

    return {
      transform: [{ scale: withSpring(targetScale, { damping: 20, stiffness: 90 }) }]
    };
  }, [activeView, importanceScore, searchStatus, mainColor]);

  const handleDotPress = () => {
    try { Haptics.selectionAsync(); } catch (e) {}
    onPress(node, 'dot');
  };

  const handleTextPress = () => {
    try { Haptics.selectionAsync(); } catch (e) {}
    onPress(node, 'text');
  };

  return (
    <Animated.View style={[{ position: 'absolute', width: '100%', height: 120 }, containerStyle]}>
      <Animated.View style={[{ 
        position: 'absolute', 
        top: 60 - node.nodeRadius * 4, 
        left: node.unfocusedX - node.nodeRadius * 4, 
        width: node.nodeRadius * 8, 
        height: node.nodeRadius * 8, 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 20 
      }, innerContentStyle]}>
        <TouchableOpacity
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={handleDotPress}
        >
          <AnimatedLinearGradient colors={[color1, color2]} style={[{ position: 'absolute', width: node.nodeRadius * 5, height: node.nodeRadius * 5, borderRadius: node.nodeRadius * 2.5 }, searchPulseStyle]} />
          <AnimatedLinearGradient colors={[color1, color2]} style={[{ position: 'absolute', width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius }, outerPulseStyle]} />
          <AnimatedLinearGradient colors={[color1, color2]} style={[{ position: 'absolute', width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius }, pulseStyle]} />
          <LinearGradient colors={[color1, color2]} pointerEvents="none" style={{ width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, opacity: node.is_refining ? 0.3 : node.ageFade + 0.2 }} />
          {node.is_refining && (
            <View style={{ position: 'absolute', width: node.nodeRadius * 4, height: node.nodeRadius * 4, borderRadius: node.nodeRadius * 2, borderWidth: 1, borderColor: mainColor, opacity: 0.5 }} />
          )}
        </TouchableOpacity>
      </Animated.View>
        
      <Animated.View 
        style={[{ 
          zIndex: 10, 
          position: 'absolute', 
          top: 30, 
          left: node.unfocusedTextLeft, 
          width: node.dynamicWidth, 
          height: 60, 
          justifyContent: 'center' 
        }, innerContentStyle]}
      >
        <TouchableOpacity 
          activeOpacity={1.0} 
          onPress={handleTextPress}
          style={{ width: '100%', height: '100%', justifyContent: 'center' }}
        >
          <Text style={[styles.noteCategory, { color: mainColor, marginBottom: 6, opacity: Math.min(1, node.ageFade + 0.4) }]}>
            {node.is_refining ? 'REFINING...' : node.category?.toUpperCase()}
          </Text>
          <View style={{ maxHeight: 60, overflow: 'hidden' }}>
            <Text numberOfLines={3} style={[styles.noteContent, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }, node.is_refining && { color: theme === 'dark' ? NightTheme.textMuted : '#BBBBBB' }]}>{node.content}</Text>
            {(node.content.length > 80 || node.displayLines > 2) && (
              <LinearGradient
                colors={theme === 'dark' ? ['rgba(15, 14, 12, 0)', 'rgba(15, 14, 12, 1)'] : ['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28 }}
                pointerEvents="none"
              />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
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
  noteContent: { fontSize: 17, fontWeight: '300', lineHeight: 26, color: '#111111' },
});
