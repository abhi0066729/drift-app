import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import DriftNode from './DriftNode';

interface GhostModeMapProps {
  mappedNotes: any[];
  onNodePress: (node: any, type: 'dot' | 'text') => void;
  totalHeight: number;
}

export default memo(function GhostModeMap({ mappedNotes, onNodePress, totalHeight }: GhostModeMapProps) {
  return (
    <ScrollView 
      contentContainerStyle={{ height: totalHeight, width: '100%' }} 
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1 }}>
        {mappedNotes.map((node) => (
          <DriftNode 
            key={node.id} 
            node={node} 
            activeView="chronos" // Ghost mode is always chronological
            onPress={onNodePress} 
          />
        ))}
      </View>
    </ScrollView>
  );
});
