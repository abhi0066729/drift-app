import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Rect, Circle, Defs, Pattern, RadialGradient, Stop } from 'react-native-svg';
import DriftNode from './DriftNode';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// 10 Mock Datasets reflecting various rich media formats
const MOCK_CARDS = [
  {
    id: 'card-1',
    source_type: 'image',
    content: 'Sunset in Manali',
    content_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80',
    tags: ['Travel', 'Mountains'],
    unfocusedX: 2000 - 220,
    unfocusedY: 2000 - 280,
    date: 'May 12 · 7:45 PM'
  },
  {
    id: 'card-2',
    source_type: 'voice',
    duration: '1:30',
    unfocusedX: 2000 + 80,
    unfocusedY: 2000 - 320,
    date: 'May 12'
  },
  {
    id: 'card-3',
    source_type: 'text',
    category: 'Idea',
    content: 'Kinetic typography scaling dynamically based on user motion acceleration.',
    unfocusedX: 2000 + 200,
    unfocusedY: 2000 - 180,
    date: 'May 12'
  },
  {
    id: 'card-4',
    source_type: 'todo',
    content: 'Rebuild Tasks',
    items: [
      { text: 'Design infinite canvas layout', completed: true },
      { text: 'Neighbor reacts magnetic avoidance', completed: true },
      { text: 'SVG curved line connectors', completed: false }
    ],
    unfocusedX: 2000 - 80,
    unfocusedY: 2000 - 40
  },
  {
    id: 'card-5',
    source_type: 'image',
    content: 'Bali Coastline',
    content_image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80',
    tags: ['Travel', 'Ocean'],
    unfocusedX: 2000 + 180,
    unfocusedY: 2000 + 30,
    date: 'May 13 · 9:15 AM'
  },
  {
    id: 'card-6',
    source_type: 'document',
    content: 'Project Brief.pdf',
    meta: 'dribbble.com · 2.4MB',
    unfocusedX: 2000 - 260,
    unfocusedY: 2000 - 20
  },
  {
    id: 'card-7',
    source_type: 'map',
    content: 'Bali Topographies',
    unfocusedX: 2000 - 120,
    unfocusedY: 2000 + 160,
    date: 'May 14'
  },
  {
    id: 'card-8',
    source_type: 'moodboard',
    content: 'Sea Textures Moodboard',
    images: [
      'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=80',
      'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80',
      'https://images.unsplash.com/photo-1473116763269-25541579ffbe?w=200&q=80'
    ],
    itemsCount: '12 items',
    unfocusedX: 2000 - 360,
    unfocusedY: 2000 + 180
  },
  {
    id: 'card-9',
    source_type: 'text',
    category: 'Journal',
    content: 'Synchronized visual layout specifications. Moving entirely to a 2D spatial canvas feed.',
    unfocusedX: 2000 + 120,
    unfocusedY: 2000 + 280,
    date: 'Today'
  },
  {
    id: 'card-10',
    source_type: 'link',
    content: 'imdb.com/title/tt0111161',
    title: 'The Shawshank Redemption',
    unfocusedX: 2000 + 300,
    unfocusedY: 2000 - 100,
    date: 'Yesterday'
  }
];

interface UserModeMapProps {
  onNodePress: (node: any, type: string) => void;
  theme?: 'light' | 'dark';
}

const UserModeMap = React.forwardRef<any, UserModeMapProps>((props, ref) => {
  const { onNodePress, theme = 'light' } = props;

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

  // Canvas Pan & Zoom gesture handler
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

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    left: -2000 + windowWidth / 2,
    top: -2000 + windowHeight / 2,
    transform: [
      { translateX: canvasX.value },
      { translateY: canvasY.value },
      { scale: canvasScale.value }
    ],
  }));

  // Visual variants mapping for Light vs Dark themes
  const isDark = true;
  const bgColor = isDark ? '#09090A' : '#FAF9F6';
  const gridDotColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
        <View style={StyleSheet.absoluteFillObject}>
          {/* Canvas Wrapper */}
          <Animated.View style={[styles.canvas, animatedCanvasStyle]}>
            
            {/* Infinite SVG Dot Grid */}
            <View style={StyleSheet.absoluteFillObject}>
              <Svg width={4000} height={4000} style={StyleSheet.absoluteFillObject}>
                <Defs>
                  {/* Dynamic Repeating Dot Grid */}
                  <Pattern id="dotGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <Circle cx="2" cy="2" r="1.2" fill={gridDotColor} />
                  </Pattern>
                </Defs>

                {/* Dot Grid Layer */}
                <Rect width={4000} height={4000} fill="url(#dotGrid)" />
              </Svg>
            </View>

            {/* Float cards in 2D coordinate positions */}
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
