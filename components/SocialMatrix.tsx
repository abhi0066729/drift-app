import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withRepeat, 
  withTiming, 
  withSequence,
  useDerivedValue,
  FadeIn,
  interpolate,
  Extrapolate,
  SharedValue,
  useAnimatedProps
} from 'react-native-reanimated';
import { Svg, Path, Circle, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { Image } from 'expo-image';
import { PanGestureHandler, GestureHandlerRootView, PinchGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import { Users, Sparkles, Zap, Plus, Minus, Maximize2 } from 'lucide-react-native';
import { Person } from '@/utils/peopleUtils';
import { NightTheme } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const NODE_GAP = 180;
const CENTER_X = SCREEN_WIDTH / 2;
const SPRING_CONFIG = { damping: 20, stiffness: 90 };

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Connection {
  source: string;
  target: string;
  strength: number;
}

const ConnectionLine = ({ 
  sourcePos, 
  targetPos, 
  strength, 
  theme 
}: { 
  sourcePos: { x: number, y: number }, 
  targetPos: { x: number, y: number }, 
  strength: number, 
  theme: 'light' | 'dark' 
}) => {
  const isDark = theme === 'dark';
  
  // Elegant vertical curve
  const midY = (sourcePos.y + targetPos.y) / 2;
  const d = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x} ${midY}, ${targetPos.x} ${midY}, ${targetPos.x} ${targetPos.y}`;
  
  return (
    <Path
      d={d}
      stroke={isDark ? "rgba(142, 68, 173, 0.6)" : "rgba(142, 68, 173, 0.3)"}
      strokeWidth={Math.min(3, 0.5 + strength * 0.5)}
      strokeOpacity={0.2 + (strength * 0.1)}
      fill="none"
    />
  );
};

const PersonNode = ({ 
  person, 
  xOffset,
  yOffset,
  onPress,
  theme,
  matrixScale
}: { 
  person: Person, 
  xOffset: number,
  yOffset: number,
  onPress: (p: Person) => void,
  theme: 'light' | 'dark',
  matrixScale: SharedValue<number>
}) => {
  const isDark = theme === 'dark';

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: CENTER_X + xOffset * matrixScale.value - 32 },
        { translateY: yOffset * matrixScale.value - 32 },
        { scale: withSpring(matrixScale.value * (1 + (person.mentionCount * 0.05)), SPRING_CONFIG) }
      ],
    };
  });

  const avatarUrl = `https://boring-avatars-api.vercel.app/api/avatar?name=${encodeURIComponent(person.name)}&variant=beam`;

  return (
    <Animated.View style={[styles.nodeContainer, animatedStyle]}>
      <Pressable 
        onPress={() => onPress(person)}
        style={({ pressed }) => [
          styles.avatarCircle,
          { 
            borderColor: isDark ? 'rgba(142, 68, 173, 0.5)' : 'rgba(142, 68, 173, 0.3)',
            backgroundColor: isDark ? NightTheme.surface : '#FFF'
          },
          pressed && { scale: 0.9, opacity: 0.8 }
        ]}
      >
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" transition={300} />
        {person.mentionCount > 2 && (
          <View style={styles.highResonanceBadge}>
             <Zap size={8} color="#FFF" fill="#FFF" />
          </View>
        )}
      </Pressable>
      <View style={[styles.labelContainer, { backgroundColor: isDark ? 'rgba(15,14,12,0.8)' : 'rgba(255,255,255,0.8)' }]}>
        <Text style={[styles.nodeName, { color: isDark ? NightTheme.textPrimary : '#111' }]} numberOfLines={1}>
          {person.name}
        </Text>
      </View>
    </Animated.View>
  );
};

export const SocialMatrix = ({ 
  people, 
  connections,
  onPersonPress, 
  theme 
}: { 
  people: Person[], 
  connections: Connection[],
  onPersonPress: (p: Person) => void,
  theme: 'light' | 'dark'
}) => {
  const scale = useSharedValue(0.9);
  const startScale = useSharedValue(0.9);

  const START_Y = 120;

  // Vertical layout calculations
  const peopleWithPositions = useMemo(() => {
    const sorted = [...people].sort((a,b) => b.mentionCount - a.mentionCount);
    return sorted.map((p, i) => {
      const yOffset = START_Y + (i + 1) * NODE_GAP;
      // Tighter vertical layout: reduce stagger
      const stagger = 40 + (i % 3) * 15;
      const xOffset = i % 2 === 0 ? -stagger : stagger;
      return { ...p, xOffset, yOffset };
    });
  }, [people]);

  const totalHeight = START_Y + (people.length + 1) * NODE_GAP + 200;

  const onPinchGestureEvent = (event: any) => {
    scale.value = Math.max(0.6, Math.min(1.2, startScale.value * event.nativeEvent.scale));
  };

  const onPinchGestureEnd = () => {
    startScale.value = scale.value;
  };

  const connectionLines = useMemo(() => {
    const mePos = { x: CENTER_X, y: START_Y };
    return peopleWithPositions.map((p, i) => {
      return (
        <ConnectionLine 
          key={`conn-${i}`}
          sourcePos={mePos}
          targetPos={{ x: CENTER_X + p.xOffset * scale.value, y: p.yOffset * scale.value }}
          strength={p.mentionCount}
          theme={theme}
        />
      );
    });
  }, [peopleWithPositions, theme, scale.value]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }]}>
      <PinchGestureHandler onGestureEvent={onPinchGestureEvent} onHandlerStateChange={(e) => e.nativeEvent.state === 5 && onPinchGestureEnd()}>
        <View style={styles.fullScreen}>
          <Animated.ScrollView 
            style={styles.fullScreen} 
            contentContainerStyle={{ height: totalHeight }}
            showsVerticalScrollIndicator={false}
          >
            <Svg style={[StyleSheet.absoluteFill, { height: totalHeight }]}>
              <Defs>
                <RadialGradient id="orbitGrad" cx="50%" cy={START_Y} rx="80%" ry="400">
                  <Stop offset="0%" stopColor={theme === 'dark' ? "#8E44AD" : "#F3E5F5"} stopOpacity={theme === 'dark' ? "0.15" : "0.4"} />
                  <Stop offset="100%" stopColor={theme === 'dark' ? NightTheme.background : "#FFFFFF"} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              
              <Circle cx={CENTER_X} cy={START_Y} r="400" fill="url(#orbitGrad)" />
              {connectionLines}
            </Svg>

            {/* ME Node at top */}
            <Animated.View style={[styles.centerNode, { top: START_Y * scale.value - 35, left: CENTER_X - 35 }]}>
               <View style={[styles.centerIcon, { backgroundColor: theme === 'dark' ? NightTheme.accent : '#F3E5F5', borderColor: theme === 'dark' ? 'transparent' : '#8E44AD', borderWidth: theme === 'dark' ? 0 : 1 }]}>
                  <Users size={32} color={theme === 'dark' ? "#FFF" : "#8E44AD"} strokeWidth={1} />
               </View>
               <Text style={[styles.centerLabel, { color: theme === 'dark' ? NightTheme.textSecondary : '#8E44AD' }]}>ME</Text>
            </Animated.View>

            {peopleWithPositions.map((p) => (
              <PersonNode 
                key={p.id}
                person={p}
                xOffset={p.xOffset}
                yOffset={p.yOffset}
                onPress={onPersonPress}
                theme={theme}
                matrixScale={scale}
              />
            ))}

            <View style={{ height: 100 }} />
          </Animated.ScrollView>

          {/* Overlays */}
          <Animated.View entering={FadeIn.delay(1000)} style={styles.hintContainer}>
             <Text style={styles.hintText}>SCROLL TO EXPLORE • PINCH TO ZOOM</Text>
          </Animated.View>
        </View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
};


export const EmptyMatrixState = ({ onSeed, theme }: { onSeed: () => void, theme: 'light' | 'dark' }) => {
  const isDark = theme === 'dark';
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.constellationWrapper}>
        {[...Array(12)].map((_, i) => (
          <Animated.View 
            key={i}
            entering={FadeIn.delay(i * 100)}
            style={[
              styles.star,
              {
                top: Math.random() * 200,
                left: Math.random() * 200,
                backgroundColor: isDark ? '#8E44AD' : '#7C3AED',
                opacity: 0.3 + Math.random() * 0.5,
              }
            ]}
          />
        ))}
        <Sparkles size={48} color={isDark ? '#8E44AD' : '#7C3AED'} strokeWidth={1} />
      </View>
      <Text style={[styles.emptyTitle, { color: isDark ? NightTheme.textPrimary : '#111' }]}>STARDUST GOSSIP</Text>
      <Text style={[styles.emptySubtitle, { color: isDark ? NightTheme.textSecondary : '#666' }]}>
        As you capture notes with names, Drift will organize them into orbital resonance here.
      </Text>
      <Pressable onPress={onSeed} style={[styles.seedButton, { backgroundColor: isDark ? NightTheme.surface : '#F9F9F9' }]}>
         <Text style={styles.seedButtonText}>GATHER STARDUST</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fullScreen: { 
    flex: 1, 
    width: '100%',
    height: '100%',
  },
  centerNode: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 }
    })
  },
  centerLabel: {
    fontSize: 8,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: 2,
  },
  nodeContainer: {
    position: 'absolute',
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  highResonanceBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#8E44AD',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  labelContainer: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    maxWidth: 80,
  },
  nodeName: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 140,
    width: '100%',
    alignItems: 'center',
  },
  hintText: {
    fontSize: 8,
    color: '#8E44AD',
    fontWeight: '800',
    letterSpacing: 2,
    opacity: 0.6,
  },
  zoomControls: {
    position: 'absolute',
    right: 20,
    bottom: 140,
    gap: 12,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
      android: { elevation: 3 }
    })
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  constellationWrapper: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 40,
  },
  star: {
     position: 'absolute',
     width: 2,
     height: 2,
     borderRadius: 1,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 2,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 50,
    lineHeight: 22,
    marginBottom: 40,
    opacity: 0.7,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    backgroundColor: '#F9F9F9',
  },
  seedButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E44AD',
    letterSpacing: 1.5,
  }
});
