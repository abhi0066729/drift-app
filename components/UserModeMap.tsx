import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, Platform, Text } from 'react-native';
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

  // Cards layout state to handle dynamic positioning, grouping, and fusion
  const [cards, setCards] = useState<any[]>(INITIAL_MOCK_CARDS);
  // Groupings: array of arrays of node IDs
  const [groups, setGroups] = useState<string[][]>([
    ['card-6', 'card-7', 'card-8'], // Initial cluster group
    ['card-12', 'card-13', 'card-14', 'card-15', 'card-16'] // Initial stacked deck group (>4 notes)
  ]);

  // Shared values for 2D Panning
  const canvasX = useSharedValue(0);
  const canvasY = useSharedValue(0);
  
  // Shared values for Zoom
  const canvasScale = useSharedValue(1.0);

  // Temporary gesture state caches
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1.0);

  // Real-time tracking of active drag node (avoidance physics helper)
  const activeDragX = useSharedValue(0);
  const activeDragY = useSharedValue(0);
  const draggedNodeId = useSharedValue<string | null>(null);

  // Motion Trajectory Line Shared Values
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

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

  // Center on focused note when index changes (controlled by shuffler slider)
  useEffect(() => {
    if (focusedCardIndex !== undefined && cards[focusedCardIndex]) {
      const node = cards[focusedCardIndex];
      const targetX = -(node.unfocusedX - 2000);
      const targetY = -(node.unfocusedY - 2000);
      canvasX.value = withSpring(targetX, { damping: 22, stiffness: 120 });
      canvasY.value = withSpring(targetY, { damping: 22, stiffness: 120 });
    }
  }, [focusedCardIndex, cards]);

  // Handle Drag collision for magnetic connection and card fusion
  const handleDragEndLocal = (nodeId: string, finalX: number, finalY: number) => {
    // 1. Audio-Image Fusion check
    const dragNode = cards.find(c => c.id === nodeId);
    const dropTarget = cards.find(c => c.id !== nodeId && Math.abs(c.unfocusedX - finalX) < 60 && Math.abs(c.unfocusedY - finalY) < 60);

    if (dragNode && dropTarget) {
      // Conjugate Voice + Image
      if (
        (dragNode.source_type === 'voice' && dropTarget.source_type === 'image') ||
        (dragNode.source_type === 'image' && dropTarget.source_type === 'voice')
      ) {
        const imageNode = dragNode.source_type === 'image' ? dragNode : dropTarget;
        const voiceNode = dragNode.source_type === 'voice' ? dragNode : dropTarget;

        setCards(prev => prev.map(c => {
          if (c.id === imageNode.id) {
            return { ...c, fusedAudio: true, duration: voiceNode.duration || '1:30' };
          }
          return c;
        }).filter(c => c.id !== voiceNode.id));
        return;
      }

      // 2. Magnetic snapping/grouping
      const inGroupIdx = groups.findIndex(g => g.includes(dropTarget.id));
      if (inGroupIdx !== -1) {
        setGroups(prev => prev.map((g, i) => i === inGroupIdx ? [...g, dragNode.id] : g));
      } else {
        setGroups(prev => [...prev, [dropTarget.id, dragNode.id]]);
      }
    }
  };

  const handleEjectCard = (nodeId: string) => {
    setGroups(prev => prev.map(g => g.filter(id => id !== nodeId)).filter(g => g.length > 0));
  };

  // Trajectory path drawing props
  const animatedTrajectoryProps = useAnimatedProps(() => {
    if (!draggedNodeId.value) return { d: '' };
    return {
      d: `M ${dragStartX.value} ${dragStartY.value} L ${activeDragX.value} ${activeDragY.value}`
    };
  });

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

  // Render wobbly rectangle paths enclosing grouped coordinates
  const renderWobblyGroups = () => {
    return groups.map((g, idx) => {
      if (g.length < 2 || g.length > 4) return null; // Only draw loops around small groups
      const members = cards.filter(c => g.includes(c.id));
      if (members.length === 0) return null;

      const minX = Math.min(...members.map(m => m.unfocusedX)) - 24;
      const maxX = Math.max(...members.map(m => m.unfocusedX)) + 196;
      const minY = Math.min(...members.map(m => m.unfocusedY)) - 24;
      const maxY = Math.max(...members.map(m => m.unfocusedY)) + 196;

      // irregular wobbly loop path outline
      const d = `M ${minX + 8} ${minY} Q ${(minX + maxX)/2} ${minY - 12} ${maxX - 8} ${minY} T ${maxX} ${minY + 24} T ${maxX + 12} ${(minY + maxY)/2} T ${maxX} ${maxY} T ${(minX + maxX)/2} ${maxY + 12} T ${minX + 8} ${maxY} T ${minX - 12} ${(minY + maxY)/2} Z`;

      return (
        <Path 
          key={`wobbly-${idx}`}
          d={d}
          stroke="#E8673C"
          strokeWidth={2.0}
          fill="none"
          strokeDasharray="4, 4"
          opacity={0.8}
        />
      );
    });
  };

  const isGalaxy = canvasScale.value < 0.4;

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

                {/* Draw movement trajectory lines */}
                <AnimatedPath
                  stroke="#E8673C"
                  strokeWidth={1.5}
                  strokeDasharray="5, 5"
                  animatedProps={animatedTrajectoryProps}
                />

                {/* Wobbly outline rectangles around small groups */}
                {!isGalaxy && renderWobblyGroups()}
              </Svg>
            </View>

            {/* Galaxy Mode Category blobs */}
            {isGalaxy && galaxyBlobs.map((blob, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.galaxyBlob, 
                  { 
                    left: blob.x - 75, 
                    top: blob.y - 75,
                    borderColor: blob.color 
                  }
                ]}
              >
                <Text style={[styles.galaxyBlobText, { color: blob.color }]}>{blob.name}</Text>
              </View>
            ))}

            {/* Render Card Nodes */}
            {!isGalaxy && cards.map((node) => {
              // Stacking UI representation: skip rendering cards folded deep in stack deck (>4 cards)
              const stackGroup = groups.find(g => g.includes(node.id) && g.length > 4);
              if (stackGroup) {
                const positionInStack = stackGroup.indexOf(node.id);
                // Only render front card (index 0) of the stack
                if (positionInStack > 0) return null;
              }

              return (
                <DriftNode
                  key={node.id}
                  node={node}
                  onPress={onNodePress}
                  activeDragX={activeDragX}
                  activeDragY={activeDragY}
                  draggedNodeId={draggedNodeId}
                  theme={theme}
                  onLongPressMenu={onOpenMenu}
                  onEjectCard={handleEjectCard}
                />
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>
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
});
