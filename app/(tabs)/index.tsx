import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore, Note } from '@/store/useNotesStore';
import * as Crypto from 'expo-crypto';
import Svg, { Path } from 'react-native-svg';
import KineticFocusMap from '@/components/KineticFocusMap';

const { width, height } = Dimensions.get('window');

const CATEGORY_COLORS: Record<string, string> = {
  Idea: '#111111',
  Todo: '#C45C2A',
  Journal: '#4A6FA5',
  Study: '#5B8C5A',
};

function generateMockNotes(): Note[] {
  const notes: Note[] = [];

  const clusters = [
    { type: 'Idea', texts: [
      "Startup Idea: An ambient audio workspace.\nUnlike traditional coffee shops where you are pressured to buy drinks or eventually leave, this is a dedicated space that charges by the hour.",
      "Strategic pivot for the new application architecture.\nWe must focus incredibly heavily on user retention during the first week.",
      "Integration of social sharing loops natively.\nInstead of forced external ads or traditional invite codes, users should inherently want to share their progress.",
    ]},
    { type: 'Journal', texts: [
      "Had a really amazing chat with Sarah today about the future of AI interfaces.\nWe both strongly agreed that current chatbot interfaces are fundamentally broken.",
      "Feeling incredibly overwhelmed but extremely productive today.\nThe Zenith canvas UI is looking absolutely insane right now. I finally managed to stabilize the bezier curves.",
      "Beautiful weather outside. Took a long walk down to the river to clear my mind.\nSometimes stepping away from the mechanical IDE solves structural logic problems.",
    ]},
    { type: 'Study', texts: [
      "Design project: A sleek minimalist desk clock that fundamentally alters your perception of time.",
      "The physical materials of the clock.\nThe desk clock must be milled out of a single block of brushed aluminum.",
      "Finished reading the essentialism book.\nThe core thesis is incredibly simple but difficult to execute: almost everything is noise.",
    ]},
    { type: 'Todo', texts: [
      "Schedule a physio appointment for my knee before next week.",
      "Increase dietary protein intake to support heavy lifting.",
      "Call the server hosting provider to upgrade the Synthesis Engine backend.",
    ]},
  ];

  clusters.forEach((cluster, clusterIndex) => {
    cluster.texts.forEach((text) => {
      const daysAgo = Math.random() * 60;
      notes.push({
        id: Crypto.randomUUID(),
        content: text,
        created_at: Date.now() - daysAgo * 24 * 60 * 60 * 1000,
        source_type: 'text',
        entities_json: JSON.stringify({ category: cluster.type, clusterId: clusterIndex }),
      });
    });
  });

  return notes.sort((a, b) => b.created_at - a.created_at);
}

function processContextualConnections(notes: Note[], width: number) {
  const clusterCounts: Record<number, number> = {};

  return notes.map((note, i) => {
    let category = 'Journal';
    let clusterId = -1;
    if (note.entities_json) {
      try {
        const parsed = JSON.parse(note.entities_json);
        category = parsed.category || parsed.categories?.[0] || 'Journal';
        clusterId = parsed.clusterId ?? -1;
      } catch (e) {}
    }

    const localIndex = clusterCounts[clusterId] || 0;
    if (clusterId !== -1) clusterCounts[clusterId] = localIndex + 1;

    const isRight = (i * 7) % 3 === 0 || i % 2 !== 0;
    const randX = (Math.abs(Math.sin(i * 37)) * 10000) % 1;
    const randY = (Math.abs(Math.cos(i * 41)) * 10000) % 1;
    const basePadding = 40;
    const varianceX = randX * 120; // Increased from 50 to 120 for more spread
    const unfocusedX = isRight ? (width - basePadding - varianceX) : (basePadding + varianceX);
    const unfocusedY = 150 + i * 480 + (randY - 0.5) * 60; // Increased from 360 to 480 for overlap prevention
    const textTargetWidth = width * 0.55;
    // Increased horizontal offset from node to avoid overlap with node circles
    const unfocusedTextLeft = isRight ? unfocusedX - textTargetWidth - 32 : unfocusedX + 40;
    const ageFade = Math.max(0.15, 1 - (i * 0.015));
    const importance = Math.min(1, note.content.length / 85);
    const nodeRadius = 3.5 + (importance * 4.5);
    const isGlowing = importance >= 0.8;
    const displayLines = Math.floor(randX * 4) + 2;

    const connectedNodeIndex = notes.findIndex((pastNote, pastIndex) => {
      if (pastIndex <= i || !pastNote.entities_json) return false;
      try {
        const pastJson = JSON.parse(pastNote.entities_json);
        const pastCategory = pastJson.category || pastJson.categories?.[0];
        return pastCategory === category;
      } catch { return false; }
    });

    return {
      ...note,
      isRight,
      unfocusedX,
      unfocusedY,
      unfocusedTextLeft,
      nodeRadius,
      ageFade,
      importance,
      isGlowing,
      category,
      categories: [category], // kept for KineticFocusMap compatibility
      clusterId,
      clusterIndex: localIndex,
      displayLines,
      connectedNodeIndex: connectedNodeIndex > -1 ? connectedNodeIndex : null,
    };
  });
}

function StaticOverlayPath({ node, targetNode }: any) {
  if (!targetNode) return null;
  const strokeColor = CATEGORY_COLORS[node.category] || '#EAEAEA';
  // Tangent scales with distance so the S-curve stays visible whether nodes are 400px or 1400px apart
  // Tangent scales with distance so the S-curve stays visible whether nodes are 400px or 1400px apart
  const dy = Math.abs(targetNode.unfocusedY - node.unfocusedY);
  const tangent = Math.max(220, dy * 0.5); // Increased from 160 for deeper S-curves
  const pathD = `M ${node.unfocusedX} ${node.unfocusedY} C ${node.unfocusedX} ${node.unfocusedY + tangent}, ${targetNode.unfocusedX} ${targetNode.unfocusedY - tangent}, ${targetNode.unfocusedX} ${targetNode.unfocusedY}`;
  return (
    <Path d={pathD} stroke={strokeColor} strokeWidth={node.importance * 1.5 + 0.5} fill="none" opacity={node.ageFade * 0.8} />
  );
}

function StaticNoteCard({ node, onPress }: any) {
  const localYBase = node.unfocusedY - 60;
  const color = CATEGORY_COLORS[node.category] || '#111111';
  return (
    <View style={{ position: 'absolute', width: '100%', top: localYBase, zIndex: 2 }}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 60 - node.nodeRadius * 4, left: node.unfocusedX - node.nodeRadius * 4, width: node.nodeRadius * 8, height: node.nodeRadius * 8, justifyContent: 'center', alignItems: 'center', zIndex: 20 }}
        activeOpacity={1}
        onPress={onPress}
      >
        <View pointerEvents="none" style={{ width: node.nodeRadius * 2, height: node.nodeRadius * 2, borderRadius: node.nodeRadius, backgroundColor: color, opacity: node.ageFade + 0.2 }} />
      </TouchableOpacity>
      <TouchableOpacity style={{ zIndex: 10, marginLeft: node.unfocusedTextLeft, width: width * 0.55, paddingTop: 30, paddingBottom: 30, justifyContent: 'center' }} activeOpacity={1.0} onPress={onPress}>
        <Text style={[styles.noteCategory, { color, marginBottom: 6, opacity: Math.min(1, node.ageFade + 0.4) }]}>{node.category?.toUpperCase()}</Text>
        <Text numberOfLines={node.displayLines} style={[styles.noteContent, node.isGlowing && { fontWeight: '400' }]}>{node.content}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore(state => state.notes);
  const setNotes = useNotesStore(state => state.setNotes);
  const [focusRootNode, setFocusRootNode] = useState<any>(null);
  const handleSeed = () => setNotes(generateMockNotes());
  const mappedNotes = useMemo(() => processContextualConnections(notes, width), [notes]);
  const totalHeight = mappedNotes.length > 0 ? mappedNotes[mappedNotes.length - 1].unfocusedY + 500 : height;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Drift Map</Text>
          <Text style={styles.subtitle}>Kinetic Semantic Synthesis</Text>
        </View>
        <TouchableOpacity style={styles.seedButton} onPress={handleSeed}>
          <Text style={styles.seedButtonText}>Seed</Text>
        </TouchableOpacity>
      </View>
      {notes.length === 0 ? (
        <Text style={styles.emptyText}>The void is empty. Capture something or tap &apos;Seed&apos; to test the physics engine.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ height: totalHeight, width: '100%' }} showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1 }}>
            <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
              <Svg width="100%" height={totalHeight}>
                {mappedNotes.map((node: any) => node.connectedNodeIndex !== null ? <StaticOverlayPath key={`line-${node.id}`} node={node} targetNode={mappedNotes[node.connectedNodeIndex]} /> : null)}
              </Svg>
            </View>
            {mappedNotes.map((node) => <StaticNoteCard key={node.id} node={node} onPress={() => setFocusRootNode(node)} />)}
          </View>
        </ScrollView>
      )}
      {focusRootNode && <KineticFocusMap rootNode={focusRootNode} mappedNotes={mappedNotes} onClose={() => setFocusRootNode(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, backgroundColor: '#FFFFFF', paddingBottom: 20, zIndex: 10 },
  title: { fontSize: 22, fontWeight: '300', color: '#111111', letterSpacing: 1 },
  subtitle: { fontSize: 9, marginTop: 4, color: '#8E44AD', textTransform: 'uppercase', letterSpacing: 2, fontWeight: '700' },
  seedButton: { backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20 },
  seedButtonText: { color: '#111111', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  noteCategory: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  noteContent: { fontSize: 18, fontWeight: '300', lineHeight: 28, color: '#111111' },
  emptyText: { fontSize: 18, color: '#999999', fontWeight: '300', lineHeight: 28, paddingHorizontal: 32, marginTop: 80 },
});
