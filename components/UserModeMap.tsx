import React, { useState, useMemo, forwardRef, memo, useRef } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue, useAnimatedReaction, runOnJS, useSharedValue } from 'react-native-reanimated';
import Svg, { Path, Line, G } from 'react-native-svg';
import { CATEGORY_COLORS } from '@/constants/Categories';
import DriftNode from './DriftNode';
import { calculateSearchMatch } from '@/utils/noteUtils';
import ResonanceFeedbackOverlay from './ResonanceFeedbackOverlay';
import NexusSurfaceMatrix from './NexusSurfaceMatrix';
import { useNotesStore } from '@/store/useNotesStore';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { IntelligenceService } from '@/services/IntelligenceService';
import { DatabaseService } from '@/services/DatabaseService';
import { NoteCategory } from '@/services/ai';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const WINDOW_BUFFER = 1500; // Baseline buffer

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
  if (visibleCurves.length === 0 || isNexus) return null;

  // Group by (category + searchStatus) to minimize Path components
  const groups: Record<string, string[]> = {};
  const metadata: Record<string, { color: string, opacity: number, width: number }> = {};

  visibleCurves.forEach(node => {
    const isSynthesis = node.source_type === 'synthesis';
    let targets: any[] = [];

    // 1. STANDARD CONNECTIONS
    if (node.connections && node.connections.length > 0) {
      targets = node.connections.map((c: any) => ({ 
        id: c.targetId, 
        category: c.category, 
        weight: c.weight || 1.0, 
        type: 'standard' 
      }));
    }

    // 2. NEURAL FILAMENTS (Synthesis Parents)
    if (isSynthesis && node.entities_json) {
      try {
        const entities = JSON.parse(node.entities_json);
        if (entities.children && Array.isArray(entities.children)) {
          entities.children.forEach((childId: string) => {
            targets.push({ id: childId, category: 'synthesis', weight: 1.2, type: 'filament' });
          });
        }
      } catch (e) {}
    }

    targets.forEach((conn: any) => {
      const targetNode = nodeMap[conn.id];
      if (
        node.unfocusedX === undefined || node.unfocusedY === undefined ||
        targetNode.unfocusedX === undefined || targetNode.unfocusedY === undefined ||
        isNaN(node.unfocusedX) || isNaN(node.unfocusedY) ||
        isNaN(targetNode.unfocusedX) || isNaN(targetNode.unfocusedY)
      ) {
        return;
      }

      const status = calculateSearchMatch(searchQuery, node);
      const dy = Math.abs(targetNode.unfocusedY - node.unfocusedY);
      const isFilament = conn.type === 'filament';
      
      let distBucket = 0;
      if (dy > 800) distBucket = 1;
      if (dy > 1800) distBucket = 2;
      
      const groupKey = `${conn.category}-${status}-${distBucket}-${conn.type}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
        const color = isFilament ? '#F1C40F' : (CATEGORY_COLORS[conn.category] || '#8E44AD');
        const weightMult = conn.weight || 1.0;
        let baseOpacity = (isFilament ? 0.9 : 0.85) * weightMult;
        
        if (distBucket === 1) baseOpacity *= 0.8;
        if (distBucket === 2) baseOpacity *= 0.6;
        const width = (node.importance || 1) * (isFilament ? 3.5 : 2.5) * weightMult + 1.2;
        
        if (status === 'dim') baseOpacity *= 0.4;
        if (status === 'match') baseOpacity = 0.95 * weightMult;
        
        metadata[groupKey] = { color, opacity: baseOpacity, width };
      }

      // Filaments have less "bowing" to feel more intentional and structural
      const tangent = Math.max(isFilament ? 100 : 160, dy * (isFilament ? 0.3 : 0.42));
      const curX = node.unfocusedX;
      const curY = node.unfocusedY - tileY;
      const tgtX = targetNode.unfocusedX;
      const tgtY = targetNode.unfocusedY - tileY;
      
      let cp1x = curX;
      let cp2x = tgtX;
      if (Math.abs(tgtX - curX) < 10) {
        const bowDir = (node.id.length % 2 === 0) ? 1 : -1;
        const bowMag = Math.min(60, dy * 0.15);
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
        const isFilament = key.endsWith('-filament');
        
        return (
          <React.Fragment key={key}>
            <Path 
              d={paths.join(' ')} 
              stroke={color} 
              strokeWidth={width} 
              fill="none" 
              opacity={opacity * 0.4} 
            />
            {isFilament && (
               <Path 
                 d={paths.join(' ')} 
                 stroke={color} 
                 strokeWidth={width * 1.5} 
                 fill="none" 
                 opacity={0.8}
                 strokeDasharray="10, 40"
                 // This would be animated in a real production Skia layer, 
                 // but for SVG we use a subtle glow.
               />
            )}
          </React.Fragment>
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
  theme: 'light' | 'dark';
}

// Removed React.memo to ensure real-time reactivity to background AI updates
const UserModeMap = React.forwardRef<Animated.ScrollView, UserModeMapProps>((props, ref) => {
  const { mappedNotes, activeView, searchQuery, onNodePress, onScroll, scrollY, totalHeight, width, theme } = props;
  const isNexus = activeView === 'nexus';
  const db = useSQLiteContext();
  
  // --- TEMPORAL WINDOWING STATE ---
  const [windowY, setWindowY] = useState(0);

  // Speed Optimization: Map for O(1) curve target lookups
  const nodeMap = useMemo(() => {
    const map: Record<string, any> = {};
    mappedNotes.forEach(n => { map[n.id] = n; });
    return map;
  }, [mappedNotes]);

  const draggingNodeRef = useRef<any>(null);
  const [draggingNode, setDraggingNode] = useState<any>(null);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const activeDragX = useSharedValue(0);
  const activeDragY = useSharedValue(0);
  const activeDragCategory = useSharedValue<string | undefined>(undefined);

  const updateNote = useNotesStore(state => state.updateNote);

  useAnimatedReaction(
    () => activeDragCategory.value,
    (curr, prev) => {
        if (curr !== prev && curr !== undefined) {
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        }
    }
  );

  const handleDragStart = (node: any, startX: number, startY: number) => {
    setDragOrigin({ x: startX, y: startY });
    draggingNodeRef.current = node;
    setDraggingNode(node);
  };

  const handleDragEnd = async (absX: number, absY: number, committedCategory?: string) => {
    const node = draggingNodeRef.current;
    const finalCat = (committedCategory || node?.category) as NoteCategory;
    
    if (node && committedCategory && finalCat !== node.category) {
        let originalEntities: Record<string, any> = {};
        try {
            originalEntities = JSON.parse(node.entities_json || '{}');
        } catch(e) {}

        const oldCat = originalEntities.category;

        const newEntitiesStr = JSON.stringify({
            ...originalEntities,
            category: finalCat,
            resonances: { [finalCat]: 1.0 }
        });

        updateNote(node.id, { 
            entities_json: newEntitiesStr,
            resonances: { [finalCat]: 1.0 } 
        });

        DatabaseService.updateNoteMetadata(db, node.id, newEntitiesStr);
        IntelligenceService.logResonanceEvent(db, {
            noteId: node.id,
            oldCategory: oldCat,
            newCategory: finalCat,
            content: node.content
        });

        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch(e){}
    }
    
    draggingNodeRef.current = null;
    setDraggingNode(null);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      if (onScroll) runOnJS(onScroll)(y);
      
      if (Math.abs(y - windowY) > 900) {
        runOnJS(setWindowY)(y);
      }
    },
  }, [windowY, onScroll, scrollY]);

  const findRangeIndices = (y: number) => {
    const currentBuffer = isNexus ? 2500 : WINDOW_BUFFER;
    const minY = y - currentBuffer;
    const maxY = y + SCREEN_HEIGHT + currentBuffer;
    
    let low = 0, high = mappedNotes.length - 1, start = 0;
    while (low <= high) {
      let mid = Math.floor((low + high) / 2);
      if (mappedNotes[mid].unfocusedY >= minY) {
        start = mid;
        high = mid - 1;
      } else low = mid + 1;
    }
    
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

  const visibleNotes = mappedNotes.slice(start, end + 1);

  const tileY = useMemo(() => Math.max(0, windowY - (isNexus ? 2500 : WINDOW_BUFFER)), [windowY, isNexus]);
  const tileHeight = SCREEN_HEIGHT + (WINDOW_BUFFER * 2);

  return (
    <View style={styles.container}>
      {/* Chronos scroll map — hidden when Nexus is active */}
      {!isNexus && (
        <Animated.ScrollView
          ref={ref}
          contentContainerStyle={{ height: totalHeight }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.svgContainer, { top: tileY, height: tileHeight }]}>
            <Svg width={width} height={tileHeight}>
              <BatchedConnectionLayer
                visibleCurves={visibleNotes}
                nodeMap={nodeMap}
                tileY={tileY}
                isNexus={false}
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
                key={`chronos-${node.id}`}
                node={node}
                isFirst={isFirst}
                activeView={activeView}
                searchStatus={status}
                onPress={onNodePress}
                onDragStart={handleDragStart}
                onDragUpdateSharedX={activeDragX}
                onDragUpdateSharedY={activeDragY}
                onDragUpdateSharedCategory={activeDragCategory}
                onDragEnd={handleDragEnd}
                scrollY={scrollY}
                isInHull={false}
              />
            );
          })}
        </Animated.ScrollView>
      )}

      {/* Nexus — full-screen absolute overlay with its own gesture system */}
      {isNexus && (
        <View style={StyleSheet.absoluteFill}>
          <NexusSurfaceMatrix
            notes={mappedNotes}
            theme={theme}
            onPress={onNodePress}
          />
        </View>
      )}

      {draggingNode && (
        <ResonanceFeedbackOverlay
          activeNodePos={{ x: activeDragX, y: activeDragY }}
          activeCategory={activeDragCategory}
          originPos={dragOrigin}
        />
      )}
    </View>
  );
});

export default UserModeMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  svgContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: -1,
  }
});
