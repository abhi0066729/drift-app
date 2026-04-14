import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Dimensions, StyleSheet, Text, View, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  interpolate, 
  Extrapolate, 
  useAnimatedReaction, 
  runOnJS, 
  FadeIn, 
  FadeOut,
  useAnimatedProps
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNotesStore } from '@/store/useNotesStore';
import { useShallow } from 'zustand/react/shallow';
import { NightTheme } from '@/constants/theme';
import KineticFocusMap from '@/components/KineticFocusMap';
import GhostOverlay from '@/components/GhostOverlay';
import ReadingModal from '@/components/ReadingModal';
import ChronosNexusToggle from '@/components/ChronosNexusToggle';
import UserModeMap from '@/components/UserModeMap';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import { generateFullGhostPool, processContextualConnections, calculateSearchMatch } from '@/utils/noteUtils';
import { TapGestureHandler, State, GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { SearchX, Moon, Sun, Search, Sparkles } from 'lucide-react-native';
import { seedSyntheticMemories } from '@/utils/seedingUtils';

const { width, height } = Dimensions.get('window');

const MapSearchEmptyState = () => {
  const poeticLines = [
    "No echoes found in this sector of the map.",
    "The spatial void remains silent to this whisper.",
    "This thought has not yet materialized in your space.",
    "The coordinates of this keyword are missing.",
    "Ripples don't reach this far into the drift."
  ];
  
  const randomLine = useMemo(() => poeticLines[Math.floor(Math.random() * poeticLines.length)], []);

  return (
    <Animated.View 
      entering={FadeIn.duration(800)} 
      exiting={FadeOut.duration(400)}
      style={styles.mapEmptySearchContainer}
      pointerEvents="none"
    >
      <SearchX size={40} color="rgba(142, 68, 173, 0.3)" strokeWidth={1} style={{ marginBottom: 20 }} />
      <Text style={styles.emptyTextTitle}>Lost in Space</Text>
      <Text style={styles.emptyTextSub}>{randomLine.toUpperCase()}</Text>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore(useShallow(state => state.notes));
  const addNote = useNotesStore(state => state.addNote);
  const theme = useNotesStore(state => state.theme);
  const toggleTheme = useNotesStore(state => state.toggleTheme);
  const [activeView, setActiveView] = useState<'chronos' | 'nexus'>('chronos');
  const [focusRootNode, setFocusRootNode] = useState<any>(null);
  const [expandedGhostId, setExpandedGhostId] = useState<string | null>(null);
  const [readingNode, setReadingNode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const mapRef = useRef<any>(null);
  
  // Search Reveal State
  const scrollOffset = useSharedValue(0);
  const searchThresholdMet = useSharedValue(false);
  const isSearchLocked = useSharedValue(false);
  const manualPullY = useSharedValue(0);
  
  useFocusEffect(
    useCallback(() => {
      setFocusRootNode(null);
      setExpandedGhostId(null);
      setReadingNode(null);
      return () => {};
    }, [])
  );

  useEffect(() => {
    if (notes.length === 0) {
      seedSyntheticMemories(addNote, notes);
    }
  }, [notes.length]);

  const displayNotes = useMemo(() => {
    if (notes.length >= 5) return notes;
    const ghostLimit = 5 - notes.length;
    const ghosts = generateFullGhostPool(ghostLimit);
    const adjustedGhosts = ghosts.map((g, i) => ({
      ...g,
      created_at: notes.length > 0 ? (notes[notes.length - 1].created_at - (i + 1) * 3600000) : g.created_at
    }));
    return [...notes, ...adjustedGhosts];
  }, [notes]);
  
  const mappedNotes = useMemo(() => processContextualConnections(displayNotes, width, searchQuery), [displayNotes, searchQuery]);
  const totalHeight = mappedNotes.length > 0 ? mappedNotes[mappedNotes.length - 1].unfocusedY + 500 : height;

  const hasSearchMatches = useMemo(() => {
    if (!searchQuery) return true;
    return mappedNotes.some(note => calculateSearchMatch(searchQuery, note) === 'match');
  }, [mappedNotes, searchQuery]);

  const handleDoubleTapSeed = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const seedData = [
        { id: `p1-${Date.now()}`, content: "Primary signal localized. Single-dimension thought flow.", created_at: Date.now() - 100000, entities_json: JSON.stringify({ category: 'Idea', emotion: 'focused' }) },
        { id: `p2-${Date.now()}`, content: "Journal entry from the morning. Simple reflection.", created_at: Date.now() - 200000, entities_json: JSON.stringify({ category: 'Journal', emotion: 'calm' }) },
        { id: `p3-${Date.now()}`, content: "Deep work session. Focused on a single task.", created_at: Date.now() - 300000, entities_json: JSON.stringify({ category: 'Study', emotion: 'concentrated' }) },
        { id: `p4-${Date.now()}`, content: "Running late. No time for deep thought.", created_at: Date.now() - 400000, entities_json: JSON.stringify({ category: 'Todo', emotion: 'hurried' }) },
        { id: `p5-${Date.now()}`, content: "Lunch was good. Not much else to say.", created_at: Date.now() - 500000, entities_json: JSON.stringify({ category: 'Journal', emotion: 'neutral' }) },
        { id: `p6-${Date.now()}`, content: "Abstract ideation. Exploring one thread at a time.", created_at: Date.now() - 600000, entities_json: JSON.stringify({ category: 'Idea', emotion: 'curious' }) },
        { id: `p7-${Date.now()}`, content: "Task #24 finalized. Moving to next item.", created_at: Date.now() - 700000, entities_json: JSON.stringify({ category: 'Todo', emotion: 'efficient' }) },
        { id: `p8-${Date.now()}`, content: "Quiet evening. Single category mindset.", created_at: Date.now() - 800000, entities_json: JSON.stringify({ category: 'Reflection', emotion: 'still' }) },
        { id: `p9-${Date.now()}`, content: "Another focused ideation point.", created_at: Date.now() - 900000, entities_json: JSON.stringify({ category: 'Idea', emotion: 'clear' }) },
        { id: `p10-${Date.now()}`, content: "Final baseline entry. Pure dimension.", created_at: Date.now() - 1000000, entities_json: JSON.stringify({ category: 'Journal', emotion: 'grounded' }) },
      ];
      
      seedData.reverse().forEach(n => addNote(n as any));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch(e){}
      Alert.alert("Pure Baseline Initialized", "10 single-dimension thoughts have been imported.");
    }
  };

  const handleDoubleTapResonance = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const resonanceData = [
        { id: `r1-${Date.now()}`, content: "SYNTHESIS: The intersection of Creative flow and Study disciplines. A hybrid masterpiece.", created_at: Date.now() - 150000, entities_json: JSON.stringify({ category: 'Creative', emotion: 'euphoric', resonances: { 'Creative': 0.9, 'Study': 0.7 } }) },
        { id: `r2-${Date.now()}`, content: "DREAM-IDEATION: Mapping subconscious metaphors onto real-world technical problems.", created_at: Date.now() - 250000, entities_json: JSON.stringify({ category: 'Dream', emotion: 'ethereal', resonances: { 'Dream': 0.8, 'Idea': 0.8 } }) },
        { id: `r3-${Date.now()}`, content: "JOURNAL-ACTION: Turning emotional anxiety into productive Todo lists.", created_at: Date.now() - 350000, entities_json: JSON.stringify({ category: 'Journal', emotion: 'determined', resonances: { 'Journal': 0.7, 'Todo': 0.9 } }) },
        { id: `r4-${Date.now()}`, content: "RESEARCH-REFLECTION: Critiquing theoretical models against personal history.", created_at: Date.now() - 450000, entities_json: JSON.stringify({ category: 'Research', emotion: 'analytical', resonances: { 'Research': 0.8, 'Reflection': 0.6 } }) },
        { id: `r5-${Date.now()}`, content: "MEETING-CREATIVE: Synthesis between user feedback and aesthetic vision.", created_at: Date.now() - 550000, entities_json: JSON.stringify({ category: 'Meeting', emotion: 'inspired', resonances: { 'Meeting': 0.8, 'Creative': 0.8 } }) },
        { id: `r6-${Date.now()}`, content: "STUDY-JOURNAL: Documenting the psychological state of deep learning.", created_at: Date.now() - 650000, entities_json: JSON.stringify({ category: 'Study', emotion: 'deep', resonances: { 'Study': 0.9, 'Journal': 0.5 } }) },
        { id: `r7-${Date.now()}`, content: "IDEA-TODO: Bridging the gap between a vision and the next concrete step.", created_at: Date.now() - 750000, entities_json: JSON.stringify({ category: 'Idea', emotion: 'urgent', resonances: { 'Idea': 0.9, 'Todo': 0.7 } }) },
        { id: `r8-${Date.now()}`, content: "REFLECTION-DREAM: Is this reality or just a really high-performance simulation?", created_at: Date.now() - 850000, entities_json: JSON.stringify({ category: 'Reflection', emotion: 'mystic', resonances: { 'Reflection': 0.8, 'Dream': 0.8 } }) },
        { id: `r9-${Date.now()}`, content: "ACTION-CREATIVE: Pure kinetic expression in the codebase. Hard logic vs liquid design.", created_at: Date.now() - 950000, entities_json: JSON.stringify({ category: 'Action', emotion: 'kinetic', resonances: { 'Action': 0.9, 'Creative': 0.6 } }) },
        { id: `r10-${Date.now()}`, content: "FINAL SYNTHESIS: The ultimate convergence of every dimensional wavelength.", created_at: Date.now() - 1050000, entities_json: JSON.stringify({ category: 'Synthesis', emotion: 'complete', resonances: { 'Synthesis': 1.0, 'Dream': 0.5, 'Idea': 0.5, 'Journal': 0.5 } }) },
      ];
      
      resonanceData.reverse().forEach(n => addNote(n as any));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch(e){}
      Alert.alert("Resonance Spectrum Localized", "10 high-dimensional synthesized thoughts have been added.");
    }
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

  const searchBarStyle = useAnimatedStyle(() => {
    let scrollRevealY = 0;
    let scrollRevealOpacity = 0;

    if (Platform.OS === 'ios') {
      scrollRevealY = interpolate(scrollOffset.value, [0, -80], [-60, 0], Extrapolate.CLAMP);
      scrollRevealOpacity = interpolate(scrollOffset.value, [0, -40], [0, 1], Extrapolate.CLAMP);
    } else {
      scrollRevealY = interpolate(manualPullY.value, [0, 80], [-60, 0], Extrapolate.CLAMP);
      scrollRevealOpacity = interpolate(manualPullY.value, [0, 40], [0, 1], Extrapolate.CLAMP);
    }

    const isPinned = isSearchLocked.value || searchQuery.length > 0;
    
    return {
      transform: [{ translateY: withSpring(isPinned ? 0 : scrollRevealY, { damping: 20, stiffness: 120 }) }],
      opacity: withTiming(isPinned ? 1 : scrollRevealOpacity, { duration: 200 }),
      zIndex: isPinned ? 100 : -1,
    };
  }, [searchQuery]);

  const searchWrapperProps = useAnimatedProps(() => {
    const isPinned = isSearchLocked.value || searchQuery.length > 0;
    return {
      pointerEvents: (isPinned ? 'auto' : 'none') as any,
    };
  });

  const handleNodePress = (node: any, type: 'dot' | 'text') => {
    if (node.is_ghost) {
      setExpandedGhostId(node.id);
    } else {
      if (type === 'text') {
        setReadingNode(node);
      } else {
        setFocusRootNode(node);
      }
    }
  };

  const handleScroll = (y: number) => {
    if (y > 300) setShowScrollTop(true);
    else setShowScrollTop(false);
  };

  const toggleSearch = () => {
    isSearchLocked.value = !isSearchLocked.value;
    if (isSearchLocked.value) {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(e){}
    }
  };

  const scrollToTop = () => {
    mapRef.current?.scrollTo({ y: 0, animated: true });
    setShowScrollTop(false);
  };

  const expandedGhostNode = mappedNotes.find((n: any) => n.id === expandedGhostId);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={-100} // Shift up more when keyboard is active
    >
        <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }]}>
          <View style={[styles.header, { backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }]}>
            <View style={styles.headerTextContainer}>
              <TapGestureHandler onHandlerStateChange={handleDoubleTapResonance} numberOfTaps={2}>
                <View>
                  <Text style={[styles.title, { color: theme === 'dark' ? '#E8E6E0' : '#111111' }]}>Drift Map</Text>
                  <Text style={styles.subtitle}>Kinetic Semantic Synthesis</Text>
                </View>
              </TapGestureHandler>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {Platform.OS === 'android' && (
                  <TouchableOpacity onPress={toggleSearch} style={[styles.themeToggleBtn, { backgroundColor: isSearchLocked.value ? 'rgba(142, 68, 173, 0.1)' : 'transparent' }]}>
                     <Search size={20} color={isSearchLocked.value ? "#8E44AD" : (theme === 'dark' ? '#E8E6E0' : '#111111')} strokeWidth={2} />
                  </TouchableOpacity>
                )}
                <Pressable onPress={toggleTheme} style={styles.themeToggleBtn}>
                  {theme === 'dark' ? (
                    <Sun size={20} color="#E8E6E0" strokeWidth={2} />
                  ) : (
                    <Moon size={20} color="#111111" strokeWidth={2} />
                  )}
                </Pressable>
              </View>
            </View>
            <View style={styles.toggleContainer}>
              <ChronosNexusToggle activeView={activeView} onToggle={setActiveView} />
            </View>
          </View>

          {!hasSearchMatches && <MapSearchEmptyState />}

          <PanGestureHandler 
            enabled={Platform.OS === 'ios'}
            onGestureEvent={onGestureEvent} 
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetY={[0, 20]} 
            failOffsetX={[-20, 20]}
          >
            <View style={{ flex: 1 }}>
              {displayNotes.length === 0 ? (
                <TapGestureHandler onHandlerStateChange={handleDoubleTapSeed} numberOfTaps={2}>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.emptyText}>The void is empty. Double tap to seed wavelengths.</Text>
                  </View>
                </TapGestureHandler>
              ) : (
                <View style={{ flex: 1 }}>
                {activeView === 'chronos' && (
                  <Animated.View 
                    style={[
                      styles.searchContainer, 
                      searchBarStyle,
                      { backgroundColor: theme === 'dark' ? NightTheme.background : 'rgba(255,255,255,0.95)' }
                    ]}
                    animatedProps={searchWrapperProps}
                  >
                    <View style={{ width: '100%' }}>
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
                        placeholder="Search your thoughts..."
                        placeholderTextColor={theme === 'dark' ? "rgba(232, 230, 224, 0.4)" : "#999"}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={false}
                        clearButtonMode="while-editing"
                        keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
                        selectionColor={theme === 'dark' ? NightTheme.accent : '#8E44AD'}
                      />
                    </View>
                  </Animated.View>
                )}
    
                  <TapGestureHandler onHandlerStateChange={handleDoubleTapSeed} numberOfTaps={2}>
                    <View style={{ flex: 1 }}>
                      <UserModeMap 
                        ref={mapRef}
                        mappedNotes={mappedNotes} 
                        activeView={activeView} 
                        theme={theme}
                        searchQuery={searchQuery}
                        onNodePress={handleNodePress} 
                        scrollY={scrollOffset}
                        onScroll={handleScroll}
                        width={width}
                        totalHeight={totalHeight} 
                      />
                    </View>
                  </TapGestureHandler>
                </View>
              )}
            </View>
          </PanGestureHandler>

          <ScrollToTopButton visible={showScrollTop} onPress={scrollToTop} />
          
          {expandedGhostNode && <GhostOverlay node={expandedGhostNode} onClose={() => setExpandedGhostId(null)} />}
          {focusRootNode && <KineticFocusMap rootNode={focusRootNode} mappedNotes={mappedNotes} onClose={() => setFocusRootNode(null)} />}
          {readingNode && <ReadingModal node={readingNode} onClose={() => setReadingNode(null)} />}
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingBottom: 10, zIndex: 10 },
  headerTextContainer: { width: '100%', paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  themeToggleBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(124, 58, 237, 0.1)' },
  title: { fontSize: 24, fontWeight: '300', letterSpacing: 1.5 },
  subtitle: { fontSize: 10, marginTop: 4, color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: '700' },
  toggleContainer: { width: '100%', alignItems: 'center', marginTop: 10 },
  emptyText: { fontSize: 18, color: '#999999', fontWeight: '300', lineHeight: 28, paddingHorizontal: 32, marginTop: 0, textAlign: 'center' },
  searchContainer: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 22, zIndex: 100, height: 60, justifyContent: 'center' },
  searchInput: { height: 45, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontWeight: '400' },
  mapEmptySearchContainer: {
    position: 'absolute',
    top: '30%', // Shifted up from 45% to stay visible above keyboard
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
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
});
