import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  useAnimatedProps
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Rect, Circle, Defs, Pattern } from 'react-native-svg';
import DriftNode from './DriftNode';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// 20 Mock Datasets reflecting various rich media formats
const MOCK_CARDS = [
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

// Linear path connections to form constellation curves between consecutive notes
const CARD_CONNECTIONS = Array.from({ length: 19 }, (_, i) => ({
  fromId: `card-${i + 1}`,
  toId: `card-${i + 2}`
}));

interface UserModeMapProps {
  onNodePress: (node: any, type: string) => void;
  theme?: 'light' | 'dark';
  focusedCardIndex?: number;
}

const UserModeMap = React.forwardRef<any, UserModeMapProps>((props, ref) => {
  const { onNodePress, theme = 'light', focusedCardIndex } = props;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

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
      canvasScale.value = Math.max(0.4, Math.min(1.5, startScale.value * event.scale));
    });

  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Center on focused note when index changes (controlled by shuffler slider)
  useEffect(() => {
    if (focusedCardIndex !== undefined && MOCK_CARDS[focusedCardIndex]) {
      const node = MOCK_CARDS[focusedCardIndex];
      const targetX = -(node.unfocusedX - 2000);
      const targetY = -(node.unfocusedY - 2000);
      canvasX.value = withSpring(targetX, { damping: 22, stiffness: 120 });
      canvasY.value = withSpring(targetY, { damping: 22, stiffness: 120 });
    }
  }, [focusedCardIndex]);

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    left: -2000 + windowWidth / 2,
    top: -2000 + windowHeight / 2,
    transform: [
      { translateX: canvasX.value },
      { translateY: canvasY.value },
      { scale: canvasScale.value }
    ],
  }));

  // Dynamic strokeWidth props for connection lines (inversely proportional to scale)
  const animatedLineProps = useAnimatedProps(() => {
    return {
      strokeWidth: 2.0 / canvasScale.value,
    };
  });

  const isDark = true;
  const gridDotColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View style={[styles.canvas, animatedCanvasStyle]}>
            
            {/* Infinite SVG Layer for grid (lines removed to resolve lag) */}
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

            {/* Render 20 Spatial Cards */}
            {MOCK_CARDS.map((node) => (
              <DriftNode
                key={node.id}
                node={node}
                onPress={onNodePress}
                activeDragX={activeDragX}
                activeDragY={activeDragY}
                draggedNodeId={draggedNodeId}
                theme={theme}
              />
            ))}
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
});
