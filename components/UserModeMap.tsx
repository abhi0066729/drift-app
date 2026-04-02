import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, SharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CATEGORY_COLORS } from '@/constants/Categories';
import DriftNode from './DriftNode';
import { calculateSearchMatch } from '@/utils/noteUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const WINDOW_BUFFER = 1000; // Extra pixels above and below

// High-Performance SVG Optimizer: Render Connection Streams in category batches
// This consolidates hundreds of draw calls into ~10 per window
const BatchedConnectionLayer = React.memo(({ visibleCurves, nodeMap, tileY, isNexus, searchQuery }: { 
  visibleCurves: any[], 
  nodeMap: Record<string, any>, 
  tileY: number, 
  isNexus: boolean,
  searchQuery: string 
}) => {
  if (visibleCurves.length === 0) return null;

  // Group by (category + searchStatus) to minimize Path components
  const groups: Record<string, string[]> = {};
  const metadata: Record<string, { color: string, opacity: number, width: number }> = {};

  visibleCurves.forEach(node => {
    const targetNode = nodeMap[node.connectedNodeId];
    if (!targetNode) return;

    const status = calculateSearchMatch(searchQuery, node);
    const groupKey = `${node.category}-${status}`;
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
      const color = CATEGORY_COLORS[node.category] || '#EAEAEA';
      let opacity = isNexus ? 0.1 : (node.ageFade || 1) * 0.8;
      const width = isNexus ? 1.5 : (node.importance || 1) * 2 + 0.8;
      
      if (status === 'dim') opacity = 0.02;
      if (status === 'match') opacity = isNexus ? 0.2 : 0.6;
      
      metadata[groupKey] = { color, opacity, width };
    }

    // Identical Curvature Logic
    const dy = Math.abs(targetNode.unfocusedY - node.unfocusedY);
    const tangent = Math.max(160, dy * 0.6);
    const curX = node.unfocusedX;
    const curY = node.unfocusedY - tileY;
    const tgtX = targetNode.unfocusedX;
    const tgtY = targetNode.unfocusedY - tileY;

    const pathD = `M ${curX} ${curY} C ${curX} ${curY + tangent}, ${tgtX} ${tgtY - tangent}, ${tgtX} ${tgtY}`;
    groups[groupKey].push(pathD);
  });

  return (
    <>
      {Object.entries(groups).map(([key, paths]) => {
        const { color, opacity, width } = metadata[key];
        return (
          <Path 
            key={key}
            d={paths.join(' ')} 
            stroke={color} 
            strokeWidth={width} 
            fill="none" 
            opacity={opacity} 
          />
        );
      })}
    </>
  );
});

interface UserModeMapProps {
  mappedNotes: any[];
  activeView: 'chronos' | 'nexus';
  searchQuery: string;
  onNodePress: (node: any, type: 'dot' | 'text') => void;
  onScroll?: (y: number) => void;
  scrollY: SharedValue<number>;
  totalHeight: number;
}

export default React.memo(React.forwardRef<Animated.ScrollView, UserModeMapProps>((props, ref) => {
  const { mappedNotes, activeView, searchQuery, onNodePress, onScroll, scrollY, totalHeight } = props;
  const isNexus = activeView === 'nexus';
  
  // --- TEMPORAL WINDOWING STATE ---
  const [windowY, setWindowY] = useState(0);

  // Speed Optimization: Map for O(1) curve target lookups
  const nodeMap = useMemo(() => {
    const map: Record<string, any> = {};
    mappedNotes.forEach(n => { map[n.id] = n; });
    return map;
  }, [mappedNotes]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      if (onScroll) runOnJS(onScroll)(y);
      
      // Update viewport tile window (throttled)
      if (Math.abs(y - windowY) > 900) {
        runOnJS(setWindowY)(y);
      }
    },
  }, [windowY, onScroll, scrollY]);

  // Binary Search Utility: Find the start and end indices of visible nodes
  // This is way faster than .filter() for 2000+ items
  const findRangeIndices = (y: number) => {
    const minY = y - WINDOW_BUFFER;
    const maxY = y + SCREEN_HEIGHT + WINDOW_BUFFER;
    
    // Find first node with Y > minY
    let low = 0, high = mappedNotes.length - 1, start = 0;
    while (low <= high) {
      let mid = Math.floor((low + high) / 2);
      if (mappedNotes[mid].unfocusedY >= minY) {
        start = mid;
        high = mid - 1;
      } else low = mid + 1;
    }
    
    // Find last node with Y < maxY
    low = start, high = mappedNotes.length - 1;
    let end = high;
    while (low <= high) {
      let mid = Math.floor((low + high) / 2);
      if (mappedNotes[mid].unfocusedY <= maxY) {
        end = mid;
        low = mid + 1;
      } else high = mid - 1;
    }
    
    return { start, end };
  };

  const { start, end } = useMemo(() => findRangeIndices(windowY), [mappedNotes, windowY]);

  const visibleNotes = useMemo(() => {
    return mappedNotes.slice(start, end + 1);
  }, [mappedNotes, start, end]);

  const tileY = useMemo(() => Math.max(0, windowY - WINDOW_BUFFER), [windowY]);
  const tileHeight = SCREEN_HEIGHT + (WINDOW_BUFFER * 2);

  const visibleCurves = useMemo(() => {
    const minY = tileY;
    const maxY = tileY + tileHeight;
    const safeStart = Math.max(0, start - 5);
    const safeEnd = Math.min(mappedNotes.length - 1, end + 5);
    
    return mappedNotes.slice(safeStart, safeEnd + 1).filter(n => {
      const targetNode = n.connectedNodeId ? nodeMap[n.connectedNodeId] : null;
      if (!targetNode) return false;
      const startVisible = n.unfocusedY >= minY && n.unfocusedY <= maxY;
      const endVisible = targetNode.unfocusedY >= minY && targetNode.unfocusedY <= maxY;
      return startVisible || endVisible;
    });
  }, [mappedNotes, nodeMap, start, end, tileY, tileHeight]);

  return (
    <Animated.ScrollView 
      ref={ref}
      contentContainerStyle={{ minHeight: totalHeight, width: '100%' }} 
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={scrollHandler}
      overScrollMode="always"
      bounces={true}
    >
      {/* Tiled Render Layer: 'Turbo' Accelerated for scaling */}
      <View 
        style={{ position: 'absolute', top: tileY, left: 0, right: 0, height: tileHeight, zIndex: 1 }} 
        pointerEvents="none"
        shouldRasterizeIOS={true} // Boost iPhone GPU performance
        renderToHardwareTextureAndroid={true} // Boost Android GPU performance
      >
        <Svg width="100%" height={tileHeight}>
          <BatchedConnectionLayer 
            visibleCurves={visibleCurves} 
            nodeMap={nodeMap} 
            tileY={tileY} 
            isNexus={isNexus}
            searchQuery={searchQuery}
          />
        </Svg>
      </View>
      
      {visibleNotes.map((node) => {
        const status = calculateSearchMatch(searchQuery, node);
        const isFirst = mappedNotes.length > 0 && node.id === mappedNotes[0].id;

        return (
          <DriftNode 
            key={node.id} 
            node={node} 
            isFirst={isFirst}
            activeView={activeView}
            searchStatus={status}
            onPress={onNodePress} 
          />
        );
      })}
    </Animated.ScrollView>
  );
}));
