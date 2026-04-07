import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, SharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CATEGORY_COLORS } from '@/constants/Categories';
import DriftNode from './DriftNode';
import { calculateSearchMatch } from '@/utils/noteUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const WINDOW_BUFFER = 1500; // Extra pixels above and below

// High-Performance SVG Optimizer: Render Connection Streams in category batches
// This consolidates hundreds of draw calls into ~10 per window
const BatchedConnectionLayer = React.memo(({ visibleCurves, nodeMap, tileY, isNexus, searchQuery, width }: { 
  visibleCurves: any[], 
  nodeMap: Record<string, any>, 
  tileY: number, 
  isNexus: boolean,
  searchQuery: string,
  width: number
}) => {
  if (visibleCurves.length === 0) return null;

  // Group by (category + searchStatus) to minimize Path components
  const groups: Record<string, string[]> = {};
  const metadata: Record<string, { color: string, opacity: number, width: number }> = {};

  visibleCurves.forEach(node => {
    if (!node.connections || node.connections.length === 0) return;

    node.connections.forEach((conn: any) => {
      const targetNode = nodeMap[conn.targetId];
      if (!targetNode) return;

      const status = calculateSearchMatch(searchQuery, node);
      const dy = Math.abs(targetNode.unfocusedY - node.unfocusedY);
      
      // PROXIMITY FADING: Determine distance bucket (0, 1, 2)
      let distBucket = 0; // Close/Strong
      if (dy > 800) distBucket = 1; // Medium/Faint
      if (dy > 1800) distBucket = 2; // Far/Very Faint
      
      const groupKey = `${conn.category}-${status}-${distBucket}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
        const color = CATEGORY_COLORS[conn.category] || '#8E44AD';
        
        // Weight the opacity and thickness based on resonance weight (conn.weight)
        const weightMult = conn.weight || 1.0;
        let baseOpacity = isNexus ? 0.35 * weightMult : 0.85 * weightMult;
        
        // Apply distance-based dimming (Solid enough to see clearly)
        if (distBucket === 1) baseOpacity *= 0.8;
        if (distBucket === 2) baseOpacity *= 0.6;

        const width = isNexus ? 1.8 : (node.importance || 1) * 2.5 * weightMult + 1.2;
        
        if (status === 'dim') baseOpacity *= 0.4;
        if (status === 'match') baseOpacity = 0.95 * weightMult;
        
        metadata[groupKey] = { color, opacity: baseOpacity, width };
      }

      // ORGANIC BOWING Logic
      const tangent = Math.max(160, dy * 0.42);
      const curX = node.unfocusedX;
      const curY = node.unfocusedY - tileY;
      const tgtX = targetNode.unfocusedX;
      const tgtY = targetNode.unfocusedY - tileY;
      
      // If X coordinates are nearly identical, bow the curve to prevent "guitar string" look
      let cp1x = curX;
      let cp2x = tgtX;
      if (Math.abs(tgtX - curX) < 10) {
        // Deterministic bow based on node ID to stay stable across renders
        const bowDir = (node.id.length % 2 === 0) ? 1 : -1;
        const bowMag = Math.min(60, dy * 0.15); // Scale bow with distance up to a cap
        cp1x = curX + (bowMag * bowDir);
        cp2x = tgtX + (bowMag * bowDir);
      }

      const pathD = `M ${curX} ${curY} C ${cp1x} ${curY + tangent}, ${cp2x} ${tgtY - tangent}, ${tgtX} ${tgtY}`;
      groups[groupKey].push(pathD);
    });
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
  width: number;
  totalHeight: number;
}

export default React.memo(React.forwardRef<Animated.ScrollView, UserModeMapProps>((props, ref) => {
  const { mappedNotes, activeView, searchQuery, onNodePress, onScroll, scrollY, totalHeight, width } = props;
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
      
      const startY = Math.min(n.unfocusedY, targetNode.unfocusedY);
      const endY = Math.max(n.unfocusedY, targetNode.unfocusedY);
      
      // Line is visible if its Y-range intersects the tile's Y-range
      return Math.max(startY, minY) <= Math.min(endY, maxY);
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
        style={{ position: 'absolute', top: tileY, left: 0, width, height: tileHeight, zIndex: 1 }} 
        pointerEvents="none"
        shouldRasterizeIOS={true} 
        renderToHardwareTextureAndroid={true} 
      >
        <Svg width={width} height={tileHeight}>
          <BatchedConnectionLayer 
            visibleCurves={visibleCurves} 
            nodeMap={nodeMap} 
            tileY={tileY} 
            isNexus={isNexus}
            searchQuery={searchQuery}
            width={width}
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
