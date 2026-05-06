import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions, Pressable } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  interpolateColor,
  withSpring,
  useAnimatedProps,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { computeGalaxyLayout, GalaxyNode, Constellation } from '@/utils/nexusEngine';
import { generateFullGhostPool } from '@/utils/noteUtils';
import { NightTheme } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/Categories';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── NodeExpandCard Component ───────────────────────────────────────────────
const NodeExpandCard = ({ 
  node, 
  screenPos, 
  isDark, 
  onClose 
}: { 
  node: GalaxyNode; 
  screenPos: { x: number, y: number }; 
  isDark: boolean;
  onClose: () => void;
}) => {
  const color = CATEGORY_COLORS[JSON.parse(node.note.entities_json || '{}').category || 'Journal'] || '#A78BFA';

  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[StyleSheet.absoluteFill, { zIndex: 100 }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      
      <Animated.View 
        entering={withSpring(FadeIn.duration(400))}
        style={[
          styles.expandCard,
          { 
            top: Math.min(SCREEN_HEIGHT - 300, Math.max(100, screenPos.y - 150)),
            left: Math.min(SCREEN_WIDTH - 320, Math.max(20, screenPos.x - 150)),
            backgroundColor: isDark ? 'rgba(20, 18, 24, 0.9)' : 'rgba(255, 255, 255, 0.9)'
          }
        ]}
      >
        <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        
        <View style={styles.cardHeader}>
          <View style={[styles.cardDot, { backgroundColor: color }]} />
          <Text style={[styles.cardCategory, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
            {(JSON.parse(node.note.entities_json || '{}').category || 'Journal').toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.cardContent, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
          {node.note.content}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            {new Date(node.note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// ─── ConstellationLayer Component ──────────────────────────────────────────
const ConstellationLayer = React.memo(({ 
  constellations, pulse 
}: { 
  constellations: Constellation[], 
  pulse: Animated.SharedValue<number> 
}) => {
  return (
    <G>
      {constellations.map(c => (
        <G key={c.id}>
          {c.edges.map((edge, i) => (
            <Line
              key={`${c.id}-edge-${i}`}
              x1={edge[0].x}
              y1={edge[0].y}
              x2={edge[1].x}
              y2={edge[1].y}
              stroke={CATEGORY_COLORS[c.category] || '#7C3AED'}
              strokeWidth={0.5}
              opacity={0.3}
            />
          ))}
        </G>
      ))}
    </G>
  );
});

// ─── Main Galaxy Component ──────────────────────────────────────────────────
interface NexusSurfaceMatrixProps {
  notes: any[];
  onPress: (node: any, type: 'dot' | 'text') => void;
  theme: 'light' | 'dark';
}

export default function NexusSurfaceMatrix({ notes, onPress, theme }: NexusSurfaceMatrixProps) {
  const isDark = theme === 'dark';
  const pulse = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const [expandedNode, setExpandedNode] = useState<{ node: GalaxyNode, pos: { x: number, y: number } } | null>(null);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0, { duration: 2500 })),
      -1,
      true
    );
  }, []);

  const displayNotes = useMemo(() => (notes && notes.length > 0) ? notes : generateFullGhostPool(), [notes]);
  const layout = useMemo(() => computeGalaxyLayout(displayNotes, SCREEN_WIDTH, SCREEN_HEIGHT), [displayNotes]);

  // Gestures
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale;
    })
    .onEnd(() => {
      scale.value = withSpring(1);
    });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  const handleNodeTap = (node: GalaxyNode) => {
    // Approximate screen position for the expansion card
    const screenX = node.x;
    const screenY = node.y;
    setExpandedNode({ node, pos: { x: screenX, y: screenY } });
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
        <Animated.View style={[styles.galaxyContainer, animatedContainerStyle]}>
          <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
            <ConstellationLayer constellations={layout.constellations} pulse={pulse} />
            
            {layout.nodes.map(node => (
              <G key={node.id} onPress={() => handleNodeTap(node)}>
                <Circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={CATEGORY_COLORS[JSON.parse(node.note.entities_json || '{}').category || 'Journal'] || '#A78BFA'}
                  opacity={0.8}
                />
              </G>
            ))}
          </Svg>
        </Animated.View>
      </GestureDetector>

      {expandedNode && (
        <NodeExpandCard 
          node={expandedNode.node}
          screenPos={expandedNode.pos}
          isDark={isDark}
          onClose={() => setExpandedNode(null)}
        />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NightTheme.background,
  },
  galaxyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandCard: {
    position: 'absolute',
    width: 300,
    minHeight: 180,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cardContent: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '300',
    marginBottom: 16,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(167, 139, 250, 0.1)',
    paddingTop: 10,
  },
  cardDate: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'right',
  }
});
