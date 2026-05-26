import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity, Animated as RNAnimated, Platform, Image } from 'react-native';
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
  let resonances: Record<string, number> = {};
  let images: string[] = note.images || [];
  const isRefining = note.is_refining;

  if (note.entities_json) {
    try {
      const parsed = JSON.parse(note.entities_json);
      if (parsed) {
        category = parsed.category || parsed.categories?.[0] || 'Journal';
        resonances = parsed.resonances || {};
        if (parsed.images && images.length === 0) {
          images = parsed.images;
        }
      }
    } catch (e) {}
  }

  const resonanceStr = useMemo(() => {
    if (!resonances || typeof resonances !== 'object') return '';
    try {
      const entries = Object.entries(resonances)
        .filter(([, v]) => typeof v === 'number' && !isNaN(v))
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 2);
      
      if (entries.length === 0) return '';
      return entries.map(([cat, val]) => `${cat}: ${Math.round((val as number) * 100)}%`).join(' | ');
    } catch (e) {
      return '';
    }
  }, [resonances]);

  const lowerQuery = searchQuery?.toLowerCase();
  const isMatch = !!(lowerQuery && (
    note.content.toLowerCase().includes(lowerQuery) ||
    category.toLowerCase().includes(lowerQuery)
  ));

  const isStudio = useNotesStore(state => state.studioSeeds?.includes(note.id));
  
  // Real-time status subscription
  const liveNote = useNotesStore(state => state.notes.find(n => n.id === note.id));
  const pipelineStep = liveNote?.pipeline_step || note.pipeline_step || 'complete';
  const isComplete = pipelineStep === 'complete';
  const nodeColor = !isComplete ? '#888888' : (CATEGORY_COLORS[category] || '#8E44AD');
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
            {note.note_type === 'page' && (
              <View style={[
                styles.nodeSquare,
                { 
                  borderColor: nodeColor,
                }
              ]} />
            )}
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
                  {note.pipeline_step && note.pipeline_step !== 'complete' ? `SYNTHESIZING...` : (category || 'Journal').toUpperCase()}
                  {note.pipeline_step === 'complete' && resonanceStr ? ` (${resonanceStr})` : ''}
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

            {/* Images collage */}
            {images && images.length > 0 && (
              <View style={styles.imageCollageContainer}>
                {images.slice(0, 3).map((imgUri: string, idx: number) => {
                  const count = Math.min(images.length, 3);
                  let imageStyle = {};
                  if (count === 1) {
                    imageStyle = { width: '100%', height: 120 };
                  } else if (count === 2) {
                    imageStyle = { width: '48%', height: 80 };
                  } else {
                    imageStyle = idx === 0 
                      ? { width: '100%', height: 100, marginBottom: 4 }
                      : { width: '48%', height: 60 };
                  }

                  return (
                    <Image 
                      key={imgUri + '-' + idx} 
                      source={{ uri: imgUri }} 
                      style={[styles.collageImage, imageStyle]} 
                      resizeMode="cover"
                    />
                  );
                })}
              </View>
            )}

            {note.pipeline_step !== 'complete' && note.pipeline_metrics && (
              <Text style={{ fontSize: 8, color: note.pipeline_step === 'error' ? '#FF5555' : nodeColor, marginTop: 4, fontWeight: '600' }}>
                {note.pipeline_step === 'error' && note.pipeline_metrics.error_message ? `ERROR: ${note.pipeline_metrics.error_message.toUpperCase()} ` : ''}
                {note.pipeline_metrics.embedding_ms ? `EMB: ${note.pipeline_metrics.embedding_ms}ms ` : ''}
                {note.pipeline_metrics.vectorizing_ms ? `| VEC: ${note.pipeline_metrics.vectorizing_ms}ms ` : ''}
                {note.pipeline_metrics.synthesis_ms ? `| AI: ${note.pipeline_metrics.synthesis_ms}ms` : ''}
                {!note.pipeline_metrics.total_ms && ` | ELAPSED: ${Date.now() - note.pipeline_metrics.start_time}ms`}
              </Text>
            )}

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
  nodeSquare: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderWidth: 0.8,
    borderRadius: 2,
    zIndex: 9,
    top: 18,
  },
  imageCollageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 4,
  },
  collageImage: {
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  // The floating card
  card: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 130, // Minimum height, grows for metrics
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
