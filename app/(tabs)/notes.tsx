import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, NativeScrollEvent, NativeSyntheticEvent, TextInput, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring, interpolate, Extrapolate, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Star, SearchX } from 'lucide-react-native';
import ArchiveNode from '@/components/ArchiveNode';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import ReadingModal from '@/components/ReadingModal';
import * as Haptics from 'expo-haptics';

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

const SearchEmptyState = () => {
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
      <SearchX size={32} color="#CCCCCC" strokeWidth={1.5} style={{ marginBottom: 20 }} />
      <Text style={styles.emptyTextTitle}>Lost in the Flux</Text>
      <Text style={styles.emptyTextSub}>{randomLine.toUpperCase()}</Text>
    </Animated.View>
  );
};

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore((state) => state.notes);
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
    () => scrollOffset.value,
    (y) => {
      if (y < -80 && !isSearchLocked.value) {
        isSearchLocked.value = true;
        searchThresholdMet.value = true;
        runOnJS(triggerHaptic)();
      } 
      else if (y > 50 && isSearchLocked.value && searchQuery.length === 0) {
        isSearchLocked.value = false;
      }
      
      if (y >= 0) {
        searchThresholdMet.value = false;
      }
    },
    [searchQuery]
  );

  const searchBarStyle = useAnimatedStyle(() => {
    const scrollRevealY = interpolate(scrollOffset.value, [0, -80], [-60, 0], Extrapolate.CLAMP);
    const scrollRevealOpacity = interpolate(scrollOffset.value, [0, -40], [0, 1], Extrapolate.CLAMP);
    const isPinned = isSearchLocked.value || searchQuery.length > 0;
    
    return {
      transform: [{ translateY: withSpring(isPinned ? 0 : scrollRevealY, { damping: 20, stiffness: 120 }) }],
      opacity: withTiming(isPinned ? 1 : scrollRevealOpacity, { duration: 200 }),
    };
  }, [searchQuery]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.content.toLowerCase().includes(lowerQuery) ||
      note.category?.toLowerCase().includes(lowerQuery)
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
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Drift Chronicle</Text>
            <Text style={styles.headerSubtitle}>LIFETIME SYNTHESIS</Text>
          </View>
          
          {notes.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>CLEAR</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Hidden Search Reveal */}
        <View style={styles.searchWrapper}>
          <Animated.View style={[styles.searchContainer, searchBarStyle]}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search chronicle..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
              clearButtonMode="while-editing"
            />
          </Animated.View>
        </View>
        
        {notes.length === 0 ? (
          <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
            <BlinkingStar />
            <Text style={styles.emptyTextTitle}>Gathering Stardust</Text>
            <Text style={styles.emptyTextSub}>Your captured thoughts will synthesize here soon.</Text>
          </Animated.View>
        ) : filteredNotes.length === 0 ? (
          <SearchEmptyState />
        ) : (
          <View style={styles.listWrapper}>
            <View style={styles.timelineAxis} />
            
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 80, 
    marginTop: 10,
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#111111',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 4,
    color: '#8E44AD',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    fontWeight: '700',
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
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
    paddingBottom: 220, // Increased padding to shift it UP
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
    height: 0,
    zIndex: 100,
    overflow: 'visible',
  },
  searchContainer: {
    position: 'absolute',
    top: -65, 
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 100,
  },
  searchInput: {
    height: 45,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111',
    fontWeight: '400',
  },
});
