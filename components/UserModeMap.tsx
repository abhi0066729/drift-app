import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CATEGORY_COLORS } from '@/constants/Categories';
import DriftNode from './DriftNode';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StaticOverlayPathProps {
  node: any;
  targetNode: any;
  activeView: 'chronos' | 'nexus';
}

function StaticOverlayPath({ node, targetNode, activeView }: StaticOverlayPathProps) {
  if (!targetNode) return null;
  const strokeColor = CATEGORY_COLORS[node.category] || '#EAEAEA';
  const dy = Math.abs(targetNode.unfocusedY - node.unfocusedY);
  const tangent = Math.max(220, dy * 0.5);
  const pathD = `M ${node.unfocusedX} ${node.unfocusedY} C ${node.unfocusedX} ${node.unfocusedY + tangent}, ${targetNode.unfocusedX} ${targetNode.unfocusedY - tangent}, ${targetNode.unfocusedX} ${targetNode.unfocusedY}`;
  
  const isNexus = activeView === 'nexus';
  const targetOpacity = isNexus ? 0.05 : (node.ageFade || 1) * 0.4;
  const targetWidth = isNexus ? 1 : (node.importance || 1) * 1.5 + 0.5;

  return (
    <AnimatedPath 
      d={pathD} 
      stroke={strokeColor} 
      strokeWidth={targetWidth} 
      fill="none" 
      opacity={targetOpacity} 
    />
  );
}

interface UserModeMapProps {
  mappedNotes: any[];
  activeView: 'chronos' | 'nexus';
  onNodePress: (node: any) => void;
  totalHeight: number;
}

export default function UserModeMap({ mappedNotes, activeView, onNodePress, totalHeight }: UserModeMapProps) {
  return (
    <ScrollView 
      contentContainerStyle={{ height: totalHeight, width: '100%' }} 
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1 }}>
        <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
          <Svg width="100%" height={totalHeight}>
            {mappedNotes.map((node: any) => 
              node.connectedNodeIndex !== null ? (
                <StaticOverlayPath 
                  key={`line-${node.id}`} 
                  node={node} 
                  targetNode={mappedNotes[node.connectedNodeIndex]} 
                  activeView={activeView} 
                />
              ) : null
            )}
          </Svg>
        </View>
        
        {mappedNotes.map((node) => (
          <DriftNode 
            key={node.id} 
            node={node} 
            activeView={activeView}
            onPress={onNodePress} 
          />
        ))}
      </View>
    </ScrollView>
  );
}
