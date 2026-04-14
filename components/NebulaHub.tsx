import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { NebulaHubData } from '@/utils/noteUtils';
import { NightTheme } from '@/constants/theme';
import { Sparkles, TrendingUp, CheckCircle, HelpCircle } from 'lucide-react-native';
import Svg, { Line } from 'react-native-svg';

interface NebulaHubProps {
  hub: NebulaHubData;
  onPress: (hub: NebulaHubData) => void;
  theme: 'light' | 'dark';
}

export default function NebulaHub({ hub, onPress, theme }: NebulaHubProps) {
  const isDark = theme === 'dark';
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1.15, { duration: 2500 }), -1, true);
  }, []);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowColor: hub.color,
    shadowOpacity: hub.summary ? 0.8 : 0.6,
    shadowRadius: hub.summary ? 35 : 25,
  }));

  const renderNarrativeIcon = (icon: string) => {
    switch(icon) {
      case 'trending-up': return <TrendingUp size={12} color={hub.color} />;
      case 'check-circle': return <CheckCircle size={12} color={hub.color} />;
      default: return <HelpCircle size={12} color={hub.color} />;
    }
  };

  return (
    <View style={[styles.container, { top: hub.y, left: hub.x - 70 }]}>
      {/* NEURAL FILAMENTS */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={300} height={300} style={{ left: -80, top: -80 }}>
           {hub.satellites.map((s: { x: number, y: number, isBridge?: boolean }, i: number) => (
             <Line 
                key={i}
                x1={150} y1={150}
                x2={150 + s.x} y2={150 + s.y}
                stroke={hub.color}
                strokeWidth={s.isBridge ? 1.5 : 0.8}
                opacity={s.isBridge ? 0.6 : 0.3}
             />
           ))}
        </Svg>
      </View>

      {/* SATELLITE PREVIEWS */}
      {hub.satellites.map((s: { x: number, y: number, isBridge?: boolean }, i: number) => (
        <View 
          key={i} 
          style={[
            styles.satellite, 
            { 
              transform: [{ translateX: s.x }, { translateY: s.y }],
              backgroundColor: hub.color,
              width: s.isBridge ? 8 : 6,
              height: s.isBridge ? 8 : 6,
              opacity: s.isBridge ? 1.0 : 0.6
            }
          ]} 
        />
      ))}

      {/* SYNTHESIS CORE */}
      <Pressable onPress={() => onPress(hub)}>
        <Animated.View style={[styles.core, coreStyle, { borderColor: hub.color, height: hub.summary ? 160 : 120, width: hub.summary ? 160 : 120, borderRadius: hub.summary ? 24 : 60 }]}>
          <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.glow, { backgroundColor: hub.color }]} />
          
          <View style={styles.header}>
            <Sparkles size={14} color={hub.color} style={{ marginRight: 6 }} />
            <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]} numberOfLines={1}>{hub.title}</Text>
          </View>

          {hub.summary && (
            <View style={styles.summaryContainer}>
               <Text style={styles.summaryText}>{hub.summary}</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.subtitle}>{hub.notes.length} NODES</Text>
            {hub.narrative?.map((n: { icon: string, label: string }, i: number) => (
              <View key={i} style={styles.narrativeBadge}>
                {renderNarrativeIcon(n.icon)}
                <Text style={[styles.narrativeLabel, { color: hub.color }]}>{n.label.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  core: {
    borderWidth: 1.5,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  title: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 8.5,
    color: '#95A5A6',
    fontWeight: '500',
    lineHeight: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  subtitle: {
    fontSize: 7,
    color: '#95A5A6',
    fontWeight: '700',
    letterSpacing: 1,
  },
  narrativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  narrativeLabel: {
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  satellite: {
    position: 'absolute',
    borderRadius: 4,
  }
});
