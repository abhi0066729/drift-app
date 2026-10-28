import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { LovableNote, CARD_WIDTH } from './LovableCardBody';
import { LovableCardNode } from './LovableCardNode';
import { ThreadsBackground } from './ThreadsBackground';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_DISTANCE = 160;

interface LovableCanvasViewProps {
  notes: LovableNote[];
  zoom: number;
  onSelectNote: (note: LovableNote) => void;
  onDoubleTapCanvas?: () => void;
  onNotesChange: (notes: LovableNote[]) => void;
}

export function LovableCanvasView({
  notes,
  zoom,
  onSelectNote,
  onDoubleTapCanvas,
  onNotesChange,
}: LovableCanvasViewProps) {
  const [fannedStack, setFannedStack] = useState<string | null>(null);

  // Pan canvas shared values
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const startPanX = useSharedValue(0);
  const startPanY = useSharedValue(0);

  // Canvas pan gesture
  const canvasPanGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startPanX.value = panX.value;
      startPanY.value = panY.value;
    })
    .onUpdate((e) => {
      'worklet';
      panX.value = startPanX.value + e.translationX;
      panY.value = startPanY.value + e.translationY;
    });

  // Double tap to toggle list view
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (onDoubleTapCanvas) {
        runOnJS(onDoubleTapCanvas)();
      }
    });

  const combinedBgGesture = Gesture.Race(canvasPanGesture, doubleTapGesture);

  const animatedCanvasStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: panX.value },
        { translateY: panY.value },
        { scale: zoom },
      ],
    };
  });

  // Calculate stack groups
  const stackGroups = useMemo(() => {
    const map = new Map<string, LovableNote[]>();
    notes.forEach((n) => {
      if (n.stack) {
        const group = map.get(n.stack) || [];
        group.push(n);
        map.set(n.stack, group);
      }
    });
    return map;
  }, [notes]);

  // Handle magnetic snap on drag release
  const handleDragEndPosition = (noteId: string, finalX: number, finalY: number) => {
    const source = notes.find((n) => n.id === noteId);
    if (!source) return;

    // Check nearest note for magnet snap
    let nearestTarget: LovableNote | null = null;
    let minDistance = SNAP_DISTANCE;

    for (const other of notes) {
      if (other.id === noteId) continue;
      const dist = Math.hypot(other.x - finalX, other.y - finalY);
      if (dist < minDistance) {
        minDistance = dist;
        nearestTarget = other;
      }
    }

    if (nearestTarget) {
      // Stack magnet snap!
      const targetStackId = nearestTarget.stack || `s_${Date.now()}`;
      const updatedNotes = notes.map((n) => {
        if (n.id === nearestTarget!.id) {
          return { ...n, stack: targetStackId };
        }
        if (n.id === noteId) {
          return {
            ...n,
            x: nearestTarget!.x,
            y: nearestTarget!.y,
            stack: targetStackId,
          };
        }
        return n;
      });
      onNotesChange(updatedNotes);
    } else {
      // Simply move card to finalX, finalY and unstack if needed
      const updatedNotes = notes.map((n) => {
        if (n.id === noteId) {
          return {
            ...n,
            x: Math.round(finalX),
            y: Math.round(finalY),
            stack: undefined,
          };
        }
        return n;
      });
      onNotesChange(updatedNotes);
    }
  };

  const handleToggleFan = (stackId: string) => {
    setFannedStack((prev) => (prev === stackId ? null : stackId));
  };

  return (
    <View style={styles.container}>
      {/* Threads Ambient Waveform Background */}
      <ThreadsBackground />

      <GestureDetector gesture={combinedBgGesture}>
        <View style={StyleSheet.absoluteFillObject}>
          {/* Dot Grid Canvas SVG */}
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Defs>
              <Pattern
                id="lovableDotGrid"
                width={28}
                height={28}
                patternUnits="userSpaceOnUse"
              >
                <Circle cx="2" cy="2" r="0.9" fill="rgba(255, 255, 255, 0.4)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#lovableDotGrid)" />
          </Svg>

          {/* Scalable & Pannable Canvas Surface */}
          <Animated.View style={[styles.canvasSurface, animatedCanvasStyle]}>
            {notes.map((note) => {
              const stackItems = note.stack ? stackGroups.get(note.stack) || [] : [];
              const isStacked = stackItems.length > 1;
              const stackIndex = isStacked ? stackItems.findIndex((x) => x.id === note.id) : 0;
              const isFanned = fannedStack === note.stack;

              return (
                <LovableCardNode
                  key={note.id}
                  note={note}
                  isFanned={isFanned}
                  stackCount={isStacked ? stackItems.length : 1}
                  stackIndex={stackIndex >= 0 ? stackIndex : 0}
                  onCardPress={onSelectNote}
                  onStackPress={handleToggleFan}
                  onDragEndPosition={handleDragEndPosition}
                />
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  canvasSurface: {
    width: 2500,
    height: 2500,
  },
});
