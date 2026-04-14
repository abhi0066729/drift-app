import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { generateMentalPattern } from '@/utils/noteUtils';

interface DriftPulseHeaderProps {
  notes: any[];
}

export default function DriftPulseHeader({ notes }: DriftPulseHeaderProps) {
  const pulseMessage = useMemo(() => generateMentalPattern(notes), [notes]);

  return (
    <Animated.View 
      entering={FadeInUp.delay(300).duration(800)}
      style={styles.container}
    >
      <View style={styles.pulseIndicator} />
      <Text style={styles.pulseText}>"{pulseMessage}"</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1000,
  },
  pulseIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C3AED', // Pulse Purple
    marginBottom: 8,
    opacity: 0.6,
  },
  pulseText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#7C3AED',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    opacity: 0.85,
    lineHeight: 18,
  },
});
