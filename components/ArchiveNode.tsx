import React, { useRef } from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { CATEGORY_COLORS } from '@/constants/Categories';
import { useNotesStore } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { Sprout } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const RefiningPulse = () => {
  const opacity = useSharedValue(0.4);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    scale.value = withRepeat(withTiming(1.5, { duration: 800 }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.refiningPulse, style]} />;
};

const ResonancePulse = ({ color }: { color: string }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    scale.value = withRepeat(withTiming(2.2, { duration: 2500 }), -1, true);
    opacity.value = withRepeat(withTiming(0, { duration: 2500 }), -1, false);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.refiningPulse, { backgroundColor: color }, style]} />;
};

const SearchMatchPulse = ({ color }: { color: string }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    scale.value = withRepeat(withSpring(2.5, { damping: 10, stiffness: 80 }), -1, true);
    opacity.value = withRepeat(withTiming(0, { duration: 1200 }), -1, false);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      styles.matchPulse, 
      { backgroundColor: color },
      style
    ]} />
  );
};

interface ArchiveNodeProps {
  note: any;
  index: number;
  onPress: (note: any) => void;
  onDelete: (id: string) => void;
  onSwipeStart: (ref: Swipeable | null) => void;
  searchQuery?: string;
}

export default function ArchiveNode({ 
  note, 
  index, 
  onPress, 
  onDelete, 
  onSwipeStart, 
  searchQuery
}: ArchiveNodeProps) {
  const theme = useNotesStore(state => state.theme);
  const swipeableRef = useRef<Swipeable>(null);
  
  let category = 'Journal';
  const isRefining = note.is_refining;

  if (note.entities_json) {
    try {
      const parsed = JSON.parse(note.entities_json);
      category = parsed.category || parsed.categories?.[0] || 'Journal';
    } catch (e) {}
  }

  // Search Match Check
  const lowerQuery = searchQuery?.toLowerCase();
  const isMatch = !!(lowerQuery && (
    note.content.toLowerCase().includes(lowerQuery) ||
    category.toLowerCase().includes(lowerQuery)
  ));

  const nodeColor = isRefining ? '#4A90E2' : (CATEGORY_COLORS[category] || '#111111');
  const dateStr = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const renderRightActions = (progress: any, dragX: any) => {
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
            style={[styles.deleteButton, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#F9F9F9' }]}
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

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 60).duration(800).springify().damping(12).stiffness(100)}
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
            pressed && styles.pressed,
            isMatch && styles.matchContainer
          ]} 
          onPress={() => onPress(note)}
        >
          {/* The Node Dot - Column is transparent to show the timeline axis behind it */}
          <View style={styles.nodeColumn}>
            {isRefining && <RefiningPulse />}
            {isMatch && <SearchMatchPulse color={nodeColor} />}
            {(!isRefining && !isMatch && (Date.now() - note.created_at < 12 * 3600000)) && <ResonancePulse color={nodeColor} />}
            <View style={[
              styles.dot, 
              { backgroundColor: nodeColor },
              isMatch && { 
                shadowColor: nodeColor, 
                shadowOpacity: 1, 
                shadowRadius: 15, 
                elevation: 10,
                transform: [{ scale: 1.2 }]
              }
            ]} />
          </View>
          
          {/* Content area is colored to hide the delete button behind it */}
          <View style={[styles.contentContainer, { backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }, isMatch && (theme === 'dark' ? { backgroundColor: 'rgba(142, 68, 173, 0.15)' } : styles.matchContent)]}>
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.categoryText, { color: nodeColor }]}>
                  {isRefining ? 'REFINING...' : category.toUpperCase()}
                </Text>
                <TouchableOpacity onPress={handleToggleSeed} style={styles.seedIcon}>
                  <Sprout 
                    size={12} 
                    color={isSeed ? '#8E44AD' : (theme === 'dark' ? NightTheme.textMuted : '#CCCCCC')} 
                    strokeWidth={isSeed ? 3 : 1.5}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.dateText, { color: theme === 'dark' ? NightTheme.textMuted : '#CCCCCC' }]}>{dateStr}</Text>
            </View>
            
            <View style={styles.textWrapper}>
              <Text style={[styles.contentText, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]} numberOfLines={3}>
                {note.content}
              </Text>
              {/* Expansion Blur Effect */}
              {!isMatch && (
                <LinearGradient
                  colors={theme === 'dark' ? ['rgba(15,14,12,0)', 'rgba(15,14,12,0.9)'] : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)']}
                  style={styles.textBlur}
                />
              )}
            </View>
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
    marginBottom: 80, 
    paddingLeft: 20,
    backgroundColor: 'transparent', 
  },
  matchContainer: {
    // Subtle highlight for matches
  },
  pressed: {
    opacity: 0.7,
  },
  nodeColumn: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4, 
    backgroundColor: 'transparent',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 20, 
  },
  refiningPulse: {
    position: 'absolute',
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4A90E2',
    opacity: 0.5,
  },
  matchPulse: {
    position: 'absolute',
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 10,
  },
  contentContainer: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchContent: {
    backgroundColor: 'rgba(142, 68, 173, 0.05)', 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  seedIcon: {
    padding: 4,
  },
  dateText: {
    fontSize: 10,
    color: '#CCCCCC',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  textWrapper: {
    position: 'relative',
  },
  contentText: {
    fontSize: 17,
    color: '#111111',
    lineHeight: 25,
    fontWeight: '300',
    paddingRight: 60, 
  },
  textBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  deleteActionContainer: {
    width: 100,
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 10,
    paddingBottom: 80, 
  },
  deleteButton: {
    backgroundColor: '#F9F9F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 28, // Correctly centered with text relative to headerRow elevation
  },
  deleteButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E74C3C',
    letterSpacing: 1.5,
  },
});
