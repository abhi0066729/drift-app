import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import DriftNode from './DriftNode';

interface GhostModeMapProps {
  mappedNotes: any[];
  onNodePress: (node: any) => void;
  totalHeight: number;
}

export default function GhostModeMap({ mappedNotes, onNodePress, totalHeight }: GhostModeMapProps) {
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
}
