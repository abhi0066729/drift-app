import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, NativeScrollEvent, NativeSyntheticEvent, TextInput, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import { useShallow } from 'zustand/react/shallow';
import { useFocusEffect } from 'expo-router';
import Animated, { 
  FadeIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  withSpring, 
  interpolate, 
  Extrapolate, 
  useAnimatedReaction, 
  runOnJS,
  useAnimatedProps
} from 'react-native-reanimated';
import { Swipeable, PanGestureHandler } from 'react-native-gesture-handler';
import { Star, SearchX, Search } from 'lucide-react-native';
import ArchiveNode from '@/components/ArchiveNode';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import ReadingModal from '@/components/ReadingModal';
import * as Haptics from 'expo-haptics';
import { NightTheme } from '@/constants/theme';
import { generateMentalPattern, generateSmartInsight } from '@/utils/noteUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BlinkingStar = () => {
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.2, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: withRepeat(withTiming(1.1, { duration: 1200 }), -1, true) }]
  }));

  return (
    <Animated.View style={[styles.starWrapper, animatedStyle]}>
      <Star size={24} color="#8E44AD" fill="#8E44AD" />
    </Animated.View>
  );
};

const SearchEmptyState = ({ theme }: { theme: 'light' | 'dark' }) => {
  const poeticLines = [
    "This keyword has no gravity here.",
    "The void remains silent to this whisper.",
    "No ripples detected in the memory stream.",
    "That thought hasn't drifted into this timeline yet.",
    "The stardust is drifting elsewhere."
  ];
  
  const randomLine = useMemo(() => poeticLines[Math.floor(Math.random() * poeticLines.length)], []);

  return (
    <Animated.View entering={FadeIn.duration(800)} style={styles.emptyState}>
      <SearchX size={32} color={theme === 'dark' ? NightTheme.textMuted : "#CCCCCC"} strokeWidth={1.5} style={{ marginBottom: 20 }} />
      <Text style={[styles.emptyTextTitle, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>Lost in the Flux</Text>
      <Text style={styles.emptyTextSub}>{randomLine.toUpperCase()}</Text>
    </Animated.View>
  );
};

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useNotesStore(state => state.theme);
  const notes = useNotesStore(useShallow(state => state.notes));
  const clearNotes = useNotesStore((state) => state.clearNotes);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const swipeableRowRef = useRef<Swipeable | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Search Reveal State
  const scrollOffset = useSharedValue(0);
  const searchThresholdMet = useSharedValue(false);
  const isSearchLocked = useSharedValue(false);
  const manualPullY = useSharedValue(0);

  const handleClear = () => {
    Alert.alert(
      "Clear Archive",
      "Are you sure you want to delete all entries?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Everything", style: "destructive", onPress: clearNotes }
      ]
    );
  };

  const handleNotePress = (note: any) => {
    setSelectedNote(note);
  };

  const handleDeleteNote = (id: string) => {
    useNotesStore.getState().deleteNote(id);
  };

  const triggerHaptic = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(e){}
  };

  useAnimatedReaction(
    () => ({ scroll: scrollOffset.value, pull: manualPullY.value }),
    ({ scroll, pull }) => {
      const triggerThreshold = Platform.OS === 'ios' ? -80 : 80;
      const val = Platform.OS === 'ios' ? scroll : pull;
      const isTriggered = Platform.OS === 'ios' ? (val < triggerThreshold) : (val > triggerThreshold);

      if (isTriggered && !isSearchLocked.value) {
        if (Platform.OS === 'ios') {
          isSearchLocked.value = true;
          searchThresholdMet.value = true;
          runOnJS(triggerHaptic)();
        }
      } 
      else if (scroll > 50 && isSearchLocked.value && searchQuery.length === 0) {
        isSearchLocked.value = false;
        manualPullY.value = 0;
      }
      
      if (scroll >= 0 && Platform.OS === 'ios') {
        searchThresholdMet.value = false;
      }
    },
    [searchQuery]
  );

  const toggleSearch = () => {
    isSearchLocked.value = !isSearchLocked.value;
    if (isSearchLocked.value) {
      triggerHaptic();
    }
  };

  const onGestureEvent = (event: any) => {
    'worklet';
    if (Platform.OS === 'ios' && scrollOffset.value <= 1 && event.nativeEvent.translationY > 0) {
      manualPullY.value = event.nativeEvent.translationY;
    }
  };

  const onHandlerStateChange = (event: any) => {
    'worklet';
    if (event.nativeEvent.oldState === 4) { // State.ACTIVE
      if (manualPullY.value <= 80) {
        manualPullY.value = withSpring(0);
      }
    }
  };

  const searchWrapperStyle = useAnimatedStyle(() => {
    const isPinned = isSearchLocked.value || searchQuery.length > 0;
    return {
      height: withTiming(isPinned ? 70 : 0, { duration: 250 }),
      opacity: withTiming(isPinned ? 1 : 0, { duration: 250 }),
    };
  });

  const searchWrapperProps = useAnimatedProps(() => {
    return {
      pointerEvents: (isSearchLocked.value || searchQuery.length > 0 ? 'auto' : 'none') as any,
    };
  });

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.content.toLowerCase().includes(lowerQuery) ||
      (note as any).category?.toLowerCase().includes(lowerQuery)
    );
  }, [notes, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      setSelectedNote(null);
      swipeableRowRef.current?.close();
      return () => {};
    }, [])
  );

  const onSwipeStart = (ref: Swipeable | null) => {
    if (swipeableRowRef.current !== ref) {
      swipeableRowRef.current?.close();
    }
    swipeableRowRef.current = ref;
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollOffset.value = y;
    if (y > 200 && !showScrollTop) setShowScrollTop(true);
    else if (y <= 200 && showScrollTop) setShowScrollTop(false);
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollTop(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
        <PanGestureHandler 
          enabled={Platform.OS === 'ios'}
          onGestureEvent={onGestureEvent} 
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetY={[0, 20]} 
          failOffsetX={[-20, 20]}
        >
          <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }]}>
            <Animated.View entering={FadeIn.duration(600)} style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>Drift Chronicle</Text>
                <Text style={styles.headerSubtitle}>
                   {generateMentalPattern(notes).toUpperCase()}
                </Text>
                <Text style={[styles.observationText, { color: NightTheme.accent }]}>
                   {generateSmartInsight('General', notes).toUpperCase()}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {Platform.OS === 'android' && (
                  <TouchableOpacity onPress={toggleSearch} style={[styles.miniBtn, { backgroundColor: isSearchLocked.value ? 'rgba(142, 68, 173, 0.1)' : 'transparent' }]}>
                    <Search size={22} color={isSearchLocked.value ? "#8E44AD" : (theme === 'dark' ? NightTheme.textSecondary : "#666")} />
                  </TouchableOpacity>
                )}
                {notes.length > 0 && (
                  <TouchableOpacity onPress={handleClear} style={[styles.clearButton, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
                    <Text style={styles.clearButtonText}>CLEAR ALL</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>

            {/* Platform Specific Search Reveal */}
            <Animated.View 
              style={[styles.searchWrapper, searchWrapperStyle]} 
              animatedProps={searchWrapperProps}
            >
              <Animated.View style={[
                styles.searchContainer, 
                { backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }
              ]}>
                <View style={{ width: '100%', paddingHorizontal: 22 }}>
                  <TextInput
                    style={[
                      styles.searchInput, 
                      { 
                        backgroundColor: theme === 'dark' ? NightTheme.surface : '#F2F2F7', 
                        color: theme === 'dark' ? NightTheme.textPrimary : '#111',
                        borderColor: theme === 'dark' ? NightTheme.border : 'transparent',
                        borderWidth: theme === 'dark' ? 1 : 0
                      }
                    ]}
                    placeholder="Search chronicle..."
                    placeholderTextColor={theme === 'dark' ? "rgba(232, 230, 224, 0.4)" : "#999"}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={false}
                    clearButtonMode="while-editing"
                    keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
                    selectionColor={theme === 'dark' ? NightTheme.accent : '#8E44AD'}
                    onFocus={() => { isSearchLocked.value = true; }}
                  />
                </View>
              </Animated.View>
            </Animated.View>
            
            {notes.length === 0 ? (
              <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
                <BlinkingStar />
                <Text style={[styles.emptyTextTitle, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>Gathering Stardust</Text>
                <Text style={[styles.emptyTextSub, { color: theme === 'dark' ? NightTheme.textMuted : '#8E44AD' }]}>Your captured thoughts will synthesize here soon.</Text>
              </Animated.View>
            ) : filteredNotes.length === 0 ? (
              <SearchEmptyState theme={theme} />
            ) : (
              <View style={styles.listWrapper}>
                <View style={[styles.timelineAxis, { backgroundColor: theme === 'dark' ? NightTheme.border : '#EEEEEE' }]} />
                
                <FlatList
                  ref={flatListRef}
                  data={filteredNotes}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <ArchiveNode 
                      note={item} 
                      index={index} 
                      onPress={handleNotePress} 
                      onDelete={handleDeleteNote}
                      onSwipeStart={onSwipeStart}
                      searchQuery={searchQuery}
                    />
                  )}
                  contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  overScrollMode="always"
                  bounces={true}
                />
              </View>
            )}

            <ScrollToTopButton visible={showScrollTop} onPress={scrollToTop} />

            <ReadingModal 
              node={selectedNote} 
              onClose={() => setSelectedNote(null)} 
              translucent={searchQuery.length > 0}
              searchQuery={searchQuery}
            />
          </View>
        </PanGestureHandler>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20, 
    marginTop: 10, 
    width: '100%',
  },
  miniBtn: { 
    padding: 8, 
    borderRadius: 20 
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#111111',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 9,
    marginTop: 4,
    color: '#8E44AD',
    textTransform: 'uppercase',
    letterSpacing: 2.0,
    fontWeight: '700',
    opacity: 0.6,
  },
  observationText: {
    fontSize: 7,
    marginTop: 2,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
  },
  clearButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E74C3C',
    letterSpacing: 1.5,
  },
  timelineAxis: {
    position: 'absolute',
    left: 40, 
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#EEEEEE',
    zIndex: 0,
  },
  listWrapper: {
    flex: 1,
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 220,
  },
  starWrapper: {
    marginBottom: 24,
  },
  emptyTextTitle: {
    fontSize: 18,
    fontWeight: '300',
    color: '#111111',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyTextSub: {
    fontSize: 8,
    color: '#8E44AD',
    textTransform: 'uppercase',
    letterSpacing: 2.0,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
  searchWrapper: {
    height: Platform.OS === 'android' ? 70 : 0,
    zIndex: 100,
    overflow: 'visible',
  },
  searchContainer: {
    position: 'relative',
    height: 60,
    justifyContent: 'center',
    zIndex: 100,
    paddingHorizontal: 0,
  },
  noteContent: {
    fontSize: 17,
    fontWeight: '300',
    lineHeight: 26,
    color: '#111111',
  },
  searchInput: {
    height: 45,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '400',
  },
});
