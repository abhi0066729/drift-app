import React, { memo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Layers } from 'lucide-react-native';
import { LovableNote, CARD_WIDTH, LovableCardBody } from './LovableCardBody';

interface LovableCardNodeProps {
  note: LovableNote;
  isFanned: boolean;
  stackCount: number;
  stackIndex: number;
  onCardPress: (note: LovableNote) => void;
  onCardLongPress?: (note: LovableNote) => void;
  onStackPress?: (stackId: string) => void;
  onDragEndPosition: (noteId: string, finalX: number, finalY: number) => void;
}

export const LovableCardNode = memo(function LovableCardNode({
  note,
  isFanned,
  stackCount,
  stackIndex,
  onCardPress,
  onCardLongPress,
  onStackPress,
  onDragEndPosition,
}: LovableCardNodeProps) {
  // Shared drag values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Compute derived stacked offset
  const stackOffsetX = stackCount > 1
    ? isFanned
      ? stackIndex * (CARD_WIDTH + 24)
      : stackIndex * 7
    : 0;

  const stackOffsetY = stackCount > 1
    ? isFanned
      ? 0
      : -stackIndex * 7
    : 0;

  const stackRotation = stackCount > 1 && !isFanned && stackIndex > 0
    ? (stackIndex % 2 === 1 ? 4 : -4) * Math.min(stackIndex, 2)
    : 0;

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.value = translateX.value;
      startY.value = translateY.value;
      isDragging.value = true;
    })
    .onUpdate((e) => {
      'worklet';
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      isDragging.value = false;
      const finalX = note.x + stackOffsetX + translateX.value;
      const finalY = note.y + stackOffsetY + translateY.value;
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      runOnJS(onDragEndPosition)(note.id, finalX, finalY);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${isDragging.value ? 3 : stackRotation}deg` },
        { scale: isDragging.value ? 1.05 : 1 },
      ],
      zIndex: isDragging.value ? 999 : 10 + stackIndex,
    };
  });

  return (
    <Animated.View
      style={[
        styles.cardOuter,
        {
          left: note.x + stackOffsetX,
          top: note.y + stackOffsetY,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <Pressable
          onPress={() => onCardPress(note)}
          onLongPress={() => onCardLongPress && onCardLongPress(note)}
          delayLongPress={450}
          style={styles.cardPressable}
        >
          {/* Card Glass Container */}
          <View style={styles.cardGlass}>
            <LovableCardBody note={note} />

            {/* Board Tag Pill */}
            {note.board && (
              <View style={styles.boardBadge}>
                <Text style={styles.boardBadgeText}>{note.board}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </GestureDetector>

      {/* Stack count indicator button for stack leader */}
      {stackCount > 1 && stackIndex === stackCount - 1 && (
        <Pressable
          onPress={() => onStackPress && note.stack && onStackPress(note.stack)}
          style={[
            styles.stackIndicator,
            {
              left: CARD_WIDTH - 24,
              top: -12,
            },
          ]}
        >
          <Layers size={11} color="#FFFFFF" />
          <Text style={styles.stackIndicatorText}>{stackCount}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  cardOuter: {
    position: 'absolute',
    width: CARD_WIDTH,
  },
  cardPressable: {
    width: CARD_WIDTH,
  },
  cardGlass: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
    shadowColor: '#1A1820',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  boardBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    backgroundColor: '#2F2E36',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 50,
  },
  boardBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  stackIndicator: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2F2E36',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 500,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  stackIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
