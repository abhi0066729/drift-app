import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import KineticFocusMap from '@/components/KineticFocusMap';
import GhostOverlay from '@/components/GhostOverlay';
import ChronosNexusToggle from '@/components/ChronosNexusToggle';
import UserModeMap from '@/components/UserModeMap';
import GhostModeMap from '@/components/GhostModeMap';
import { generateFullGhostPool, generateMockUserNotes, processContextualConnections } from '@/utils/noteUtils';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore(state => state.notes);
  const setNotes = useNotesStore(state => state.setNotes);
  const [activeView, setActiveView] = useState<'chronos' | 'nexus'>('chronos');
  const [focusRootNode, setFocusRootNode] = useState<any>(null);
  const [expandedGhostId, setExpandedGhostId] = useState<string | null>(null);

  // Core Routing Logic: Sandbox or Production
  const isSandbox = notes.length < 5;

  const displayNotes = useMemo(() => {
    return isSandbox ? [...notes, ...generateFullGhostPool(5)] : notes;
  }, [notes, isSandbox]);
  
  const mappedNotes = useMemo(() => processContextualConnections(displayNotes, width), [displayNotes]);
  const totalHeight = mappedNotes.length > 0 ? mappedNotes[mappedNotes.length - 1].unfocusedY + 500 : height;

  const handleNodePress = (node: any) => {
    if (node.is_ghost) {
      setExpandedGhostId(node.id);
    } else {
      setFocusRootNode(node);
    }
  };

  const expandedGhostNode = mappedNotes.find((n: any) => n.id === expandedGhostId);

  useEffect(() => {
    // TEMPORARY: Automatic seed 20 notes for testing. 
    // Delete this when the user is done recording navigation GIFs.
    if (notes.length < 20) {
      setNotes(generateMockUserNotes());
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Header / Nav Section */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Drift Map</Text>
          <Text style={styles.subtitle}>Kinetic Semantic Synthesis</Text>
        </View>
        <View style={styles.toggleContainer}>
          <ChronosNexusToggle activeView={activeView} onToggle={setActiveView} />
        </View>
      </View>

      {/* Main Content Area */}
      {displayNotes.length === 0 ? (
        <Text style={styles.emptyText}>The void is empty. Capture something to begin.</Text>
      ) : isSandbox ? (
        <GhostModeMap 
          mappedNotes={mappedNotes} 
          onNodePress={handleNodePress} 
          totalHeight={totalHeight} 
        />
      ) : (
        <UserModeMap 
          mappedNotes={mappedNotes} 
          activeView={activeView} 
          onNodePress={handleNodePress} 
          totalHeight={totalHeight} 
        />
      )}
      
      {/* Cinematic Modal for Ghost Notes */}
      {expandedGhostNode && (
        <GhostOverlay 
          node={expandedGhostNode} 
          onClose={() => setExpandedGhostId(null)} 
        />
      )}

      {/* Classic Focus Mode Overlay */}
      {focusRootNode && (
        <KineticFocusMap 
          rootNode={focusRootNode} 
          mappedNotes={mappedNotes} 
          onClose={() => setFocusRootNode(null)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { alignItems: 'center', backgroundColor: '#FFFFFF', paddingBottom: 10, zIndex: 10 },
  headerText: { width: '100%', paddingHorizontal: 22, alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '300', color: '#111111', letterSpacing: 1.5 },
  subtitle: { fontSize: 10, marginTop: 4, color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: '700' },
  toggleContainer: { width: '100%', alignItems: 'center', marginTop: 10 },
  emptyText: { fontSize: 18, color: '#999999', fontWeight: '300', lineHeight: 28, paddingHorizontal: 32, marginTop: 80, textAlign: 'center' },
});
