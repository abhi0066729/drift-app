import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, SharedValue } from 'react-native-reanimated';
import DriftNode from './DriftNode';
import { calculateSearchMatch } from '@/utils/noteUtils';

interface GhostModeMapProps {
  mappedNotes: any[];
  searchQuery: string;
  onNodePress: (node: any, type: 'dot' | 'text') => void;
  scrollY: SharedValue<number>;
  totalHeight: number;
}

export default memo(function GhostModeMap({ mappedNotes, searchQuery, onNodePress, scrollY, totalHeight }: GhostModeMapProps) {
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  return (
    <Animated.ScrollView 
      contentContainerStyle={{ height: totalHeight, width: '100%' }} 
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={scrollHandler}
    >
      <View style={{ flex: 1 }}>
        {mappedNotes.map((node) => {
          const status = calculateSearchMatch(searchQuery, node);
          return (
            <DriftNode 
              key={node.id} 
              node={node} 
              activeView="chronos" // Ghost mode is always chronological
              searchStatus={status}
              onPress={onNodePress} 
            />
          );
        })}
      </View>
    </Animated.ScrollView>
  );
});
