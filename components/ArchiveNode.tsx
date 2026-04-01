import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CATEGORY_COLORS } from '@/constants/Categories';

interface ArchiveNodeProps {
  note: any;
  index: number;
  onPress: (note: any) => void;
}

export default function ArchiveNode({ note, index, onPress }: ArchiveNodeProps) {
  // Extract category for the ribbon
  let category = 'Journal';
  if (note.entities_json) {
    try {
      const parsed = JSON.parse(note.entities_json);
      category = parsed.category || parsed.categories?.[0] || 'Journal';
    } catch (e) {}
  }

  const ribbonColor = CATEGORY_COLORS[category] || '#111111';
  const dateStr = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).duration(400).springify().damping(20)}
    >
      <Pressable 
        style={({ pressed }) => [
          styles.container,
          pressed && styles.pressed
        ]} 
        onPress={() => onPress(note)}
      >
        {/* Category Ribbon */}
        <View style={[styles.ribbon, { backgroundColor: ribbonColor }]} />
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.categoryText, { color: ribbonColor }]}>
              {category.toUpperCase()}
            </Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          
          <Text style={styles.contentText} numberOfLines={3}>
            {note.content}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  ribbon: {
    width: 6,
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  dateText: {
    fontSize: 10,
    color: '#BBBBBB',
    fontWeight: '500',
  },
  contentText: {
    fontSize: 15,
    color: '#111111',
    lineHeight: 22,
    fontWeight: '300',
  },
});
