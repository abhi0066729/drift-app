import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CATEGORY_COLORS } from '@/constants/Categories';
import DriftNode from './DriftNode';
import { calculateSearchMatch } from '@/utils/noteUtils';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StaticOverlayPathProps {
  node: any;
  targetNode: any;
  activeView: 'chronos' | 'nexus';
}

const StaticOverlayPath = React.memo(({ node, targetNode, activeView, searchStatus }: StaticOverlayPathProps & { searchStatus?: 'match' | 'dim' | 'none' }) => {
  if (!targetNode) return null;
  const strokeColor = CATEGORY_COLORS[node.category] || '#EAEAEA';
  
  const isNexus = activeView === 'nexus';
  let targetOpacity = isNexus ? 0.05 : (node.ageFade || 1) * 0.4;
  const targetWidth = isNexus ? 1 : (node.importance || 1) * 1.5 + 0.5;

  if (searchStatus === 'dim') targetOpacity = 0.02; 
  if (searchStatus === 'match') targetOpacity = isNexus ? 0.2 : 0.6;

  const dy = Math.abs(targetNode.unfocusedY - node.unfocusedY);
  const tangent = Math.max(220, dy * 0.5);
  const pathD = `M ${node.unfocusedX} ${node.unfocusedY} C ${node.unfocusedX} ${node.unfocusedY + tangent}, ${targetNode.unfocusedX} ${targetNode.unfocusedY - tangent}, ${targetNode.unfocusedX} ${targetNode.unfocusedY}`;
  
  return (
    <AnimatedPath 
      d={pathD} 
      stroke={strokeColor} 
      strokeWidth={targetWidth} 
      fill="none" 
      opacity={targetOpacity} 
    />
  );
}, (prev, next) => {
  return prev.activeView === next.activeView && prev.node.id === next.node.id && prev.searchStatus === next.searchStatus;
});

interface UserModeMapProps {
  mappedNotes: any[];
  activeView: 'chronos' | 'nexus';
  searchQuery: string;
  onNodePress: (node: any, type: 'dot' | 'text') => void;
  scrollY: SharedValue<number>;
  totalHeight: number;
}

export default React.memo(function UserModeMap({ mappedNotes, activeView, searchQuery, onNodePress, scrollY, totalHeight }: UserModeMapProps) {
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <Animated.ScrollView 
      contentContainerStyle={{ minHeight: totalHeight, width: '100%' }} 
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={scrollHandler}
    >
      <View style={[StyleSheet.absoluteFill, { height: totalHeight, zIndex: 1 }]} pointerEvents="none">
        <Svg width="100%" height={totalHeight}>
          {searchQuery.trim() === '' && mappedNotes.map((node: any) => {
            const status = calculateSearchMatch(searchQuery, node);
            return node.connectedNodeIndex !== null ? (
              <StaticOverlayPath 
                key={`line-${node.id}`} 
                node={node} 
                targetNode={mappedNotes[node.connectedNodeIndex]} 
                activeView={activeView}
                searchStatus={status}
              />
            ) : null;
          })}
        </Svg>
      </View>
      
      {mappedNotes.map((node) => {
        const status = calculateSearchMatch(searchQuery, node);
        return (
          <DriftNode 
            key={node.id} 
            node={node} 
            activeView={activeView}
            searchStatus={status}
            onPress={onNodePress} 
          />
        );
      })}
    </Animated.ScrollView>
  );
});
