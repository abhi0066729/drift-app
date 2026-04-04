import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Dimensions, StyleSheet, Text, View, Pressable, TextInput, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolate, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useNotesStore } from '@/store/useNotesStore';
import KineticFocusMap from '@/components/KineticFocusMap';
import GhostOverlay from '@/components/GhostOverlay';
import ReadingModal from '@/components/ReadingModal';
import ChronosNexusToggle from '@/components/ChronosNexusToggle';
import UserModeMap from '@/components/UserModeMap';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import { generateFullGhostPool, processContextualConnections } from '@/utils/noteUtils';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore(state => state.notes);
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
  
  // Developer Testing State
  const lastTap = useRef<number>(0);
  
  useFocusEffect(
    useCallback(() => {
      // Reset interaction state on enter
      setFocusRootNode(null);
      setExpandedGhostId(null);
      setReadingNode(null);

      return () => {
        // Optional: Reset on leave as well if needed
      };
    }, [])
  );

  const displayNotes = useMemo(() => {
    // If user has 5 or more notes, vanish ghosts entirely
    if (notes.length >= 5) return notes;
    
    // Otherwise, fill the remaining slots with ghosts to keep a high-density "training" field
    const ghostLimit = 5 - notes.length;
    const ghosts = generateFullGhostPool(ghostLimit);
    
    // Ghost timestamps should be older than real notes to appear below them
    const adjustedGhosts = ghosts.map((g, i) => ({
      ...g,
      created_at: notes.length > 0 ? (notes[notes.length - 1].created_at - (i + 1) * 3600000) : g.created_at
    }));

    return [...notes, ...adjustedGhosts];
  }, [notes]);
  
  const mappedNotes = useMemo(() => processContextualConnections(displayNotes, width, searchQuery), [displayNotes, searchQuery]);
  const totalHeight = mappedNotes.length > 0 ? mappedNotes[mappedNotes.length - 1].unfocusedY + 500 : height;

  const handleDevGesture = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) {
      // BURST MODE: Add 20 Random Notes
      const categories = ['Journal', 'Idea', 'Reflection', 'Creative', 'Todo'];
      const emotions = ['excited', 'contemplative', 'peaceful', 'focused', 'dreamy'];
      
      for (let i = 0; i < 20; i++) {
        const id = `debug-${Date.now()}-${i}`;
        const timestamp = Date.now() - (Math.random() * 1000 * 60 * 60 * 24 * 30); // Random within 30 days
        const cat = categories[Math.floor(Math.random() * categories.length)];
        
        const debugNote: any = {
          id,
          content: `Burst Capture #${i + 1}: Synthetic thought fragment exploring ${cat.toLowerCase()} semantics.`,
          created_at: timestamp,
          source_type: 'text',
          is_refining: false,
          entities_json: JSON.stringify({
            category: cat,
            emotion: emotions[Math.floor(Math.random() * emotions.length)],
            people: [],
            topics: ["debug", "burst"],
            sentiment: "neutral",
            urgency: i % 5 === 0 ? "high" : "low",
            dates: []
          })
        };
        
        useNotesStore.getState().addNote(debugNote);
      }
      
      triggerHaptic();
      Alert.alert("Burst Synthesis Complete", "20 debug fragments localized to the map.");
    }
    lastTap.current = now;
  };

  const triggerHaptic = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch(e){}
  };

  useAnimatedReaction(
    () => scrollOffset.value,
    (y) => {
      // Lock it if pulled deep
      if (y < -80 && !isSearchLocked.value) {
        isSearchLocked.value = true;
        searchThresholdMet.value = true;
        runOnJS(triggerHaptic)();
      } 
      // Unlock it if swiped up significantly
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
    // Reveal starts at -20, fully visible at -80
    const scrollRevealY = interpolate(scrollOffset.value, [0, -80], [-60, 0], Extrapolate.CLAMP);
    const scrollRevealOpacity = interpolate(scrollOffset.value, [0, -40], [0, 1], Extrapolate.CLAMP);
    
    // If pinned or typing, force peak visibility
    const isPinned = isSearchLocked.value || searchQuery.length > 0;
    
    return {
      transform: [{ translateY: withSpring(isPinned ? 0 : scrollRevealY, { damping: 20, stiffness: 120 }) }],
      opacity: withTiming(isPinned ? 1 : scrollRevealOpacity, { duration: 200 }),
    };
  }, [searchQuery]);

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
    if (y > 300) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    mapRef.current?.scrollTo({ y: 0, animated: true });
    setShowScrollTop(false);
  };

  const expandedGhostNode = mappedNotes.find((n: any) => n.id === expandedGhostId);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Header / Nav Section */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Drift Map</Text>
          <Pressable 
            onPress={handleDevGesture}
          >
            <Text style={styles.subtitle}>
              Kinetic Semantic Synthesis
            </Text>
          </Pressable>
        </View>
        <View style={styles.toggleContainer}>
          <ChronosNexusToggle activeView={activeView} onToggle={setActiveView} />
        </View>
      </View>

      {/* Main Content Area */}
      {displayNotes.length === 0 ? (
        <Text style={styles.emptyText}>The void is empty. Capture something to begin.</Text>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Transitionary Search Reveal */}
          <Animated.View style={[styles.searchContainer, searchBarStyle]}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your thoughts..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
              clearButtonMode="while-editing"
            />
          </Animated.View>

          <UserModeMap 
            ref={mapRef}
            mappedNotes={mappedNotes} 
            activeView={activeView} 
            searchQuery={searchQuery}
            onNodePress={handleNodePress} 
            scrollY={scrollOffset}
            onScroll={handleScroll}
            width={width}
            totalHeight={totalHeight} 
          />
        </View>
      )}

      <ScrollToTopButton 
        visible={showScrollTop} 
        onPress={scrollToTop} 
      />
      
      {/* Cinematic Modal for Ghost Notes */}
      {expandedGhostNode && (
        <GhostOverlay 
          node={expandedGhostNode} 
          onClose={() => setExpandedGhostId(null)} 
        />
      )}

      {/* Classic Focus Mode Overlay */}
      {focusRootNode && (
        <KineticFocusMap 
          rootNode={focusRootNode} 
          mappedNotes={mappedNotes} 
          onClose={() => setFocusRootNode(null)} 
        />
      )}

      {/* Independent Reading Modal over Map */}
      {readingNode && (
        <ReadingModal 
          node={readingNode} 
          onClose={() => setReadingNode(null)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', paddingBottom: 10, zIndex: 10 },
  headerText: { width: '100%', paddingHorizontal: 22, alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '300', color: '#111111', letterSpacing: 1.5 },
  subtitle: { fontSize: 10, marginTop: 4, color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: '700' },
  toggleContainer: { width: '100%', alignItems: 'center', marginTop: 10 },
  emptyText: { fontSize: 18, color: '#999999', fontWeight: '300', lineHeight: 28, paddingHorizontal: 32, marginTop: 80, textAlign: 'center' },
  searchContainer: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 22, zIndex: 100, height: 60, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.95)' },
  searchInput: { height: 45, backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#111', fontWeight: '400' },
});
