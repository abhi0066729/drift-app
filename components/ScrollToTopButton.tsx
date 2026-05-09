import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  FadeIn, 
  FadeOut,
  Easing
} from 'react-native-reanimated';
import { ChevronUp } from 'lucide-react-native';

interface ScrollToTopButtonProps {
  visible: boolean;
  onPress: () => void;
}

export default function ScrollToTopButton({ visible, onPress }: ScrollToTopButtonProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(2.0, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: Math.max(0, 0.35 * (1 - (pulse.value - 1) / 1.0)),
  }));

  if (!visible) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      exiting={FadeOut.duration(400)}
      style={styles.container}
      pointerEvents="box-none"
    >
      <View style={styles.pulseContainer}>
        <Animated.View style={[styles.pulseCircle, pulseStyle]} />
        <TouchableOpacity 
          style={styles.button} 
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={styles.arrowBg}>
            <ChevronUp size={18} color="#FFFFFF" strokeWidth={3} />
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110, // Moved higher to clear the tab bar/nav menu
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pulseContainer: {
    width: 50, // Smaller overall container
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8E44AD',
    opacity: 0.2,
  },
  button: {
    width: 36, // Scaled down the button
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8E44AD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  arrowBg: {
    width: 30, // Scaled down the inner core
    height: 30,
    borderRadius: 15,
    backgroundColor: '#8E44AD',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
