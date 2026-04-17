import React from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity, Animated as RNAnimated, Platform } from 'react-native';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { useNotesStore } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { Sprout } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ArchiveNodeProps {
  note: any;
  index: number;
  onPress: (note: any) => void;
  onDelete: (id: string) => void;
  onSwipeStart: (ref: Swipeable | null) => void;
  searchQuery?: string;
  scrollOffset?: any;
}

// --- Pulsating Signal Dot ---
const SignalDot = ({ color }: { color: string }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.6, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.signalContainer}>
      <Animated.View style={[styles.signalGlow, { backgroundColor: color }, animatedStyle]} />
      <View style={[styles.signalCore, { backgroundColor: color }]} />
    </View>
  );
};

export default function ArchiveNode({ 
  note, 
  index, 
  onPress, 
  onDelete, 
  onSwipeStart, 
  searchQuery
}: ArchiveNodeProps) {
  const theme = useNotesStore(state => state.theme);
  const swipeableRef = React.useRef<Swipeable>(null);
  const isDark = theme === 'dark';
  
  let category = 'Journal';
  const isRefining = note.is_refining;

  if (note.entities_json) {
    try {
      const parsed = JSON.parse(note.entities_json);
      category = parsed.category || parsed.categories?.[0] || 'Journal';
    } catch (e) {}
  }

  const lowerQuery = searchQuery?.toLowerCase();
  const isMatch = !!(lowerQuery && (
    note.content.toLowerCase().includes(lowerQuery) ||
    category.toLowerCase().includes(lowerQuery)
  ));

  const nodeColor = isRefining ? '#4A90E2' : (CATEGORY_COLORS[category] || '#8E44AD');
  const dateStr = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const accentR = parseInt(nodeColor.slice(1, 3), 16);
  const accentG = parseInt(nodeColor.slice(3, 5), 16);
  const accentB = parseInt(nodeColor.slice(5, 7), 16);
  const accentRgba = (a: number) => `rgba(${accentR},${accentG},${accentB},${a})`;

  const renderRightActions = (progress: any) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.deleteActionContainer}>
        <RNAnimated.View style={{ transform: [{ scale }], opacity }}>
          <TouchableOpacity 
            onPress={() => {
              onDelete(note.id);
              swipeableRef.current?.close();
            }}
            style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFF5F5' }]}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    );
  };

  const isSeed = useNotesStore(state => state.studioSeeds?.includes(note.id));

  const handleToggleSeed = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch(e){}
    useNotesStore.getState().toggleStudioSeed(note.id);
  };

  const isTruncated = note.content.length > 115 || note.content.split('\n').length > 3;

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).duration(600).springify().damping(18).stiffness(140)}
      style={styles.wrapper}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={1.5}
        rightThreshold={40}
        overshootRight={true}
        onSwipeableWillOpen={() => onSwipeStart(swipeableRef.current)}
        containerStyle={styles.swipeableContainer}
      >
        <Pressable 
          style={({ pressed }) => [
            styles.container,
            pressed && { opacity: 0.75 }
          ]} 
          onPress={() => onPress(note)}
        >
          {/* Timeline Node Column */}
          <View style={styles.nodeColumn}>
            {/* The Node Dot */}
            <View style={[
              styles.nodeDot,
              { 
                backgroundColor: nodeColor,
                shadowColor: nodeColor,
                shadowOpacity: isDark ? 0.8 : 0.4,
                shadowRadius: isDark ? 8 : 4,
                shadowOffset: { width: 0, height: 0 },
                elevation: 3,
              }
            ]} />
          </View>

          {/* Floating Note Card */}
          <View style={[
            styles.card,
            isDark ? {
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.08)',
              borderWidth: 1,
            } : {
              backgroundColor: '#FFFFFF',
              borderColor: accentRgba(0.08),
              borderWidth: 1,
              ...(Platform.OS === 'ios' ? {
                shadowColor: 'rgba(0,0,0,0.08)',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 1,
                shadowRadius: 20,
              } : { elevation: 3 }),
            }
          ]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.categoryRow}>
                <Text style={[styles.categoryText, { color: nodeColor }]}>
                  {isRefining ? 'REFINING...' : category.toUpperCase()}
                </Text>
                <TouchableOpacity onPress={handleToggleSeed} hitSlop={8}>
                  <Sprout 
                    size={11} 
                    color={isSeed ? '#8E44AD' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')} 
                    strokeWidth={isSeed ? 3 : 1.5}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.dateText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }]}>
                {dateStr}
              </Text>
            </View>
            
            {/* Body */}
            <Text 
              style={[
                styles.contentText, 
                { color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)' }
              ]} 
              numberOfLines={3}
            >
              {note.content}
            </Text>

            {/* Neural Signal Dot (Inside card) */}
            {isTruncated && <SignalDot color="#8E44AD" />}
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeableContainer: {
    backgroundColor: 'transparent',
  },
  wrapper: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    paddingRight: 20,
    marginBottom: 24,
    backgroundColor: 'transparent', 
  },
  // The timeline axis column
  nodeColumn: {
    width: 64,
    alignItems: 'center',
    paddingTop: 22,
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 10,
  },
  // The floating card
  card: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    height: 130, // Locked height for consistency
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  contentText: {
    fontSize: 15,
    fontWeight: '300',
    lineHeight: 23,
    letterSpacing: 0.15,
  },
  signalContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  signalCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 2,
  },
  signalGlow: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  deleteActionContainer: {
    width: 90,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  deleteButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E74C3C',
    letterSpacing: 1,
  },
});
