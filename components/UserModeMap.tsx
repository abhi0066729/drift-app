import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, Platform, Text, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  useAnimatedProps,
  withTiming
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Rect, Circle, Defs, Pattern } from 'react-native-svg';
import DriftNode from './DriftNode';
import { useNotesStore } from '@/store/useNotesStore';
import { BlurView } from 'expo-blur';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// 20 Mock Datasets reflecting various rich media formats
const INITIAL_MOCK_CARDS = [
  { id: 'card-1', source_type: 'image', content: 'Manali Heights', content_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80', unfocusedX: 2000 - 320, unfocusedY: 2000 - 380, date: 'Today · 8:15 AM', category: 'Travel' },
  { id: 'card-2', source_type: 'voice', duration: '1:30', unfocusedX: 2000 + 120, unfocusedY: 2000 - 360, date: 'Today' },
  { id: 'card-3', source_type: 'text', category: 'Idea', content: 'Kinetic typography scaling dynamically based on user motion acceleration.', unfocusedX: 2000 + 380, unfocusedY: 2000 - 240, date: 'Today' },
  { id: 'card-4', source_type: 'todo', content: 'Rebuild Tasks', items: [{ text: 'Design infinite canvas layout', completed: true }, { text: 'SVG curved line connectors', completed: false }], unfocusedX: 2000 - 80, unfocusedY: 2000 - 160 },
  { id: 'card-5', source_type: 'image', content: 'Bali Coastline', content_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80', unfocusedX: 2000 + 260, unfocusedY: 2000 - 20, date: 'Yesterday · 9:15 AM', category: 'Travel' },
  { id: 'card-6', source_type: 'document', content: 'Project Brief.pdf', meta: 'dribbble.com · 2.4MB', unfocusedX: 2000 - 340, unfocusedY: 2000 - 60 },
  { id: 'card-7', source_type: 'map', content: 'Bali Topographies', unfocusedX: 2000 - 180, unfocusedY: 2000 + 120, date: 'May 14' },
  { id: 'card-8', source_type: 'moodboard', content: 'Sea Textures', images: ['https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=80', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80'], itemsCount: '12 items', unfocusedX: 2000 - 420, unfocusedY: 2000 + 220 },
  { id: 'card-9', source_type: 'text', category: 'Journal', content: 'Synchronized visual layout specifications. Moving entirely to a 2D spatial canvas feed.', unfocusedX: 2000 + 120, unfocusedY: 2000 + 180, date: 'May 13' },
  { id: 'card-10', source_type: 'link', content: 'imdb.com/title/tt0111161', title: 'The Shawshank Redemption', unfocusedX: 2000 + 380, unfocusedY: 2000 + 80, date: 'May 13' },
  { id: 'card-11', source_type: 'image', content: 'Tokyo Streets', content_image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=400&q=80', unfocusedX: 2000 - 240, unfocusedY: 2000 + 340, date: 'May 14 · 10:20 PM', category: 'Inspiration' },
  { id: 'card-12', source_type: 'voice', duration: '0:45', unfocusedX: 2000 - 60, unfocusedY: 2000 + 420, date: 'May 14' },
  { id: 'card-13', source_type: 'text', category: 'Reflection', content: 'Fiercely protect your focus. Almost everything is noise.', unfocusedX: 2000 + 220, unfocusedY: 2000 + 380, date: 'May 15' },
  { id: 'card-14', source_type: 'todo', content: 'Weekly Groceries', items: [{ text: 'Oat milk & Espresso beans', completed: true }, { text: 'Avocados & Sourdough bread', completed: false }], unfocusedX: 2000 + 440, unfocusedY: 2000 + 280 },
  { id: 'card-15', source_type: 'link', content: 'linear.app/design', title: 'Linear Design System', unfocusedX: 2000 - 460, unfocusedY: 2000 - 220, date: 'May 15' },
  { id: 'card-16', source_type: 'document', content: 'Roadmap_v2.pdf', meta: 'google.drive · 1.8MB', unfocusedX: 2000 - 180, unfocusedY: 2000 - 320 },
  { id: 'card-17', source_type: 'map', content: 'Studio Location', unfocusedX: 2000 + 80, unfocusedY: 2000 - 480, date: 'May 16' },
  { id: 'card-18', source_type: 'moodboard', content: 'Amber Palette', images: ['https://images.unsplash.com/photo-1509316975850-ff9c5edd0cd9?w=200&q=80', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&q=80'], itemsCount: '6 items', unfocusedX: 2000 - 380, unfocusedY: 2000 - 460 },
  { id: 'card-19', source_type: 'image', content: 'Mountain Summit', content_image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80', unfocusedX: 2000 + 480, unfocusedY: 2000 - 420, date: 'May 16 · 5:30 AM', category: 'Outdoors' },
  { id: 'card-20', source_type: 'text', category: 'Study', content: 'Deep study into React Native SVG rendering performance optimizations.', unfocusedX: 2000 - 480, unfocusedY: 2000 + 60, date: 'May 17' }
];

interface UserModeMapProps {
  onNodePress: (node: any, type: string) => void;
  theme?: 'light' | 'dark';
  focusedCardIndex?: number;
  onOpenMenu?: (node: any) => void;
}

const UserModeMap = React.forwardRef<any, UserModeMapProps>((props, ref) => {
  const { onNodePress, theme = 'light', focusedCardIndex, onOpenMenu } = props;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const storeNotes = useNotesStore(state => state.notes);

  // Cards layout state dynamically bound to store notes
  const cards = useMemo(() => {
    const activeNotes = storeNotes.length > 0 ? storeNotes : INITIAL_MOCK_CARDS;
    
    // Map favorited/liked notes to center visible resolution area (radius ~ 110px around 2000, 2000)
    return (activeNotes as any[]).map((note: any, idx) => {
      let x = note.layout_x !== undefined ? note.layout_x : note.unfocusedX;
      let y = note.layout_y !== undefined ? note.layout_y : note.unfocusedY;
      
      if (x === undefined || y === undefined) {
        // Fallback positioning if undefined
        x = 2000 + (Math.random() * 200 - 100);
        y = 2000 + (Math.random() * 200 - 100);
      }

      if (note.is_liked) {
        // Place favorited nodes in immediate visible ring centered on (2000, 2000)
        const angle = (idx * 2 * Math.PI) / Math.max(1, activeNotes.filter((n: any) => n.is_liked).length);
        const radius = 110; // First visible screen boundary ring
        x = 2000 + Math.cos(angle) * radius;
        y = 2000 + Math.sin(angle) * radius;
      }
      return {
        ...note,
        unfocusedX: x,
        unfocusedY: y,
      };
    });
  }, [storeNotes]);

  // Groupings: array of arrays of node IDs
  const [groups, setGroups] = useState<string[][]>([
    ['card-6', 'card-7', 'card-8'], // Initial cluster group
    ['card-12', 'card-13', 'card-14', 'card-15', 'card-16'] // Initial stacked deck group (>4 notes)
  ]);

  const [activeStackGroup, setActiveStackGroup] = useState<string[] | null>(null);

  // Shared values for 2D Panning centered on 2000, 2000
  const canvasX = useSharedValue(0);
  const canvasY = useSharedValue(0);
  
  // Shared values for Zoom
  const canvasScale = useSharedValue(1.0);

  // Temporary gesture state caches
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1.0);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.value = canvasX.value;
      startY.value = canvasY.value;
    })
    .onUpdate((event) => {
      'worklet';
      canvasX.value = startX.value + event.translationX;
      canvasY.value = startY.value + event.translationY;
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      startScale.value = canvasScale.value;
    })
    .onUpdate((event) => {
      'worklet';
      canvasScale.value = Math.max(0.2, Math.min(1.5, startScale.value * event.scale));
    });

  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Automatically center the canvas view on the centroid of the card structure on mount or when cards are added
  useEffect(() => {
    if (cards.length > 0) {
      let sumX = 0;
      let sumY = 0;
      cards.forEach(c => {
        sumX += c.unfocusedX;
        sumY += c.unfocusedY;
      });
      const avgX = sumX / cards.length;
      const avgY = sumY / cards.length;
      
      canvasX.value = withSpring(-(avgX - 2000), { damping: 24, stiffness: 100 });
      canvasY.value = withSpring(-(avgY - 2000), { damping: 24, stiffness: 100 });
    }
  }, [cards.length]);

  // Center on focused note when index changes (controlled by shuffler slider)
  useEffect(() => {
    if (focusedCardIndex !== undefined && cards[focusedCardIndex]) {
      const node = cards[focusedCardIndex];
      const targetX = -(node.unfocusedX - 2000);
      const targetY = -(node.unfocusedY - 2000);
      canvasX.value = withSpring(targetX, { damping: 22, stiffness: 120 });
      canvasY.value = withSpring(targetY, { damping: 22, stiffness: 120 });
    }
  }, [focusedCardIndex]);

  // Handle Drag collision for magnetic connection and card fusion
  const handleDragEndLocal = (nodeId: string, targetId: string) => {
    // 1. Audio-Image Fusion check
    const dragNode = cards.find(c => c.id === nodeId) as any;
    const dropTarget = cards.find(c => c.id === targetId) as any;

    if (dragNode && dropTarget) {
      // Conjugate Voice + Image
      if (
        (dragNode.source_type === 'voice' && dropTarget.source_type === 'image') ||
        (dragNode.source_type === 'image' && dropTarget.source_type === 'voice')
      ) {
        const imageNode = (dragNode.source_type === 'image' ? dragNode : dropTarget) as any;
        const voiceNode = (dragNode.source_type === 'voice' ? dragNode : dropTarget) as any;

        const { NoteService } = require('@/services/NoteService');
        NoteService.getInstance().updateNote(imageNode.id, { 
          fusedAudio: true, 
          duration: voiceNode.duration || '1:30' 
        });
        NoteService.getInstance().deleteNote(voiceNode.id);
        return;
      }

      // 2. Magnetic snapping/grouping
      setGroups(prev => {
        const clean = prev.map(g => g.filter(id => id !== nodeId)).filter(g => g.length > 0);
        const inGroupIdx = clean.findIndex(g => g.includes(targetId));
        if (inGroupIdx !== -1) {
          return clean.map((g, i) => i === inGroupIdx ? [...g, nodeId] : g);
        } else {
          return [...clean, [targetId, nodeId]];
        }
      });
    }
  };

  const handleEjectCard = (nodeId: string) => {
    setGroups(prev => prev.map(g => g.filter(id => id !== nodeId)).filter(g => g.length > 0));
  };

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    left: -2000 + windowWidth / 2,
    top: -2000 + windowHeight / 2,
    transform: [
      { translateX: canvasX.value },
      { translateY: canvasY.value },
      { scale: canvasScale.value }
    ],
  }));

  const isDark = true;
  const gridDotColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // Category Galaxy View configuration (renders when canvasScale < 0.4)
  const galaxyBlobs = [
    { name: 'IDEA', color: '#E8673C', x: 2000 - 400, y: 2000 - 400 },
    { name: 'JOURNAL', color: '#3498DB', x: 2000 + 400, y: 2000 - 400 },
    { name: 'TASKS', color: '#2ECC71', x: 2000 - 400, y: 2000 + 400 },
    { name: 'STUDY', color: '#9B59B6', x: 2000 + 400, y: 2000 + 400 },
    { name: 'REFLECTION', color: '#F1C40F', x: 2000, y: 2000 - 600 },
    { name: 'DREAM', color: '#1ABC9C', x: 2000, y: 2000 + 600 },
    { name: 'CUSTOM PROJECT', color: '#E67E22', x: 2000 - 600, y: 2000 }
  ];

  const isGalaxy = false; // Disabled galaxy view to prevent zooming out to categories

  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View style={[styles.canvas, animatedCanvasStyle]}>
            
            {/* SVG Layer */}
            <View style={StyleSheet.absoluteFillObject}>
              <Svg width={4000} height={4000} style={StyleSheet.absoluteFillObject}>
                <Defs>
                  <Pattern id="dotGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <Circle cx="2" cy="2" r="1.2" fill={gridDotColor} />
                  </Pattern>
                </Defs>

                {/* Dot Grid */}
                <Rect width={4000} height={4000} fill="url(#dotGrid)" />
              </Svg>
            </View>


            {/* Render Card Nodes */}
            {!isGalaxy && cards.map((node) => {
              // Stacking UI representation: skip rendering cards folded deep in stack deck
              const stackGroup = groups.find(g => g.includes(node.id));
              if (stackGroup) {
                const positionInStack = stackGroup.indexOf(node.id);
                // Only render front card (index 0) of the stack
                if (positionInStack > 0) return null;
              }

              const isInGroup = stackGroup && stackGroup.length > 1;

              return (
                <DriftNode
                  key={node.id}
                  node={node}
                  parentPanGesture={panGesture}
                  onPress={(n) => {
                    if (isInGroup) {
                      setActiveStackGroup(stackGroup);
                    } else {
                      onNodePress(n, 'text');
                    }
                  }}
                  theme={theme}
                  onLongPressMenu={onOpenMenu}
                  stackCount={isInGroup ? stackGroup!.length : 1}
                />
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>

      {/* Floating Scrollable Stack Carousel Overlay */}
      {activeStackGroup && (
        <View style={styles.carouselModalOverlay}>
          <BlurView experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined} intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setActiveStackGroup(null)} />
          
          <View style={styles.carouselContainer}>
            <Text style={styles.carouselTitle}>STACKED CARDS ({activeStackGroup.length})</Text>
            
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScrollContent}
            >
              {activeStackGroup.map((cardId) => {
                const node = cards.find(c => c.id === cardId);
                if (!node) return null;
                return (
                  <View key={cardId} style={styles.carouselCardWrapper}>
                    <DriftNode
                      node={node}
                      onPress={(n) => {
                        onNodePress(n, 'text');
                        setActiveStackGroup(null);
                      }}
                      theme={theme}
                      onLongPressMenu={onOpenMenu}
                      onEjectCard={(id) => {
                        handleEjectCard(id);
                        setActiveStackGroup(prev => prev ? prev.filter(x => x !== id) : null);
                      }}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeCarouselBtn} 
              onPress={() => setActiveStackGroup(null)}
            >
              <Text style={styles.closeCarouselText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

export default UserModeMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    width: 4000,
    height: 4000,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galaxyBlob: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galaxyBlobText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  carouselModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  carouselContainer: {
    width: '90%',
    height: 320,
    backgroundColor: 'rgba(15, 15, 18, 0.95)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 16,
  },
  carouselTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E8673C',
    letterSpacing: 1.0,
    marginBottom: 16,
  },
  carouselScrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  carouselCardWrapper: {
    width: 200,
    height: 180,
    marginHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeCarouselBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeCarouselText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
