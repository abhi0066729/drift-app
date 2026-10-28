import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function LovableHeader({
  notesCount,
  onPressAllNotes,
}: {
  notesCount: number;
  onPressAllNotes?: () => void;
}) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Emblem & App Title */}
      <View style={styles.topRow}>
        <View style={styles.emblemWrapper}>
          <Svg viewBox="0 0 40 40" style={styles.emblemSvg}>
            {Array.from({ length: 20 }, (_, i) => (
              <Path
                key={i}
                d="M20 3V11"
                stroke="#2F2E36"
                strokeWidth="2"
                transform={`rotate(${i * 18} 20 20)`}
              />
            ))}
          </Svg>
        </View>
        <Text style={styles.brandTitle}>drift</Text>
      </View>

      {/* Main Title */}
      <View style={styles.titleRow}>
        <Text style={styles.mainHeading}>Your notes</Text>
        <Text style={styles.sparkle}>✧</Text>
      </View>

      {/* Pill Badge */}
      <View style={styles.badgeRow}>
        <View style={styles.pill}>
          <View style={styles.countCircle}>
            <Text style={styles.countText}>{notesCount}</Text>
          </View>
          <Text style={styles.pillLabel}>All notes</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    zIndex: 100,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emblemWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emblemSvg: {
    width: 24,
    height: 24,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2F2E36',
    letterSpacing: -0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainHeading: {
    fontSize: 40,
    fontWeight: '300',
    color: '#2F2E36',
    letterSpacing: -0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  sparkle: {
    fontSize: 24,
    color: '#D4A373',
    marginLeft: 6,
    fontWeight: '300',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  countCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D4A373',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2F2E36',
  },
});
