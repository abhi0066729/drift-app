import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import ArchiveNode from '@/components/ArchiveNode';
import ReadingModal from '@/components/ReadingModal';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore((state) => state.notes);
  const clearNotes = useNotesStore((state) => state.clearNotes);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const swipeableRowRef = useRef<Swipeable | null>(null);

  const handleClear = () => {
    Alert.alert(
      "Clear Archive",
      "Are you sure you want to delete all entries?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Everything", style: "destructive", onPress: clearNotes }
      ]
    );
  };

  const handleNotePress = (note: any) => {
    setSelectedNote(note);
  };

  const handleDeleteNote = (id: string) => {
    useNotesStore.getState().deleteNote(id);
  };

  const onSwipeStart = (ref: Swipeable | null) => {
    if (swipeableRowRef.current !== ref) {
      swipeableRowRef.current?.close();
    }
    swipeableRowRef.current = ref;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Drift Chronicle</Text>
          <Text style={styles.headerSubtitle}>LIFETIME SYNTHESIS</Text>
        </View>
        
        {notes.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>CLEAR</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {notes.length === 0 ? (
        <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
          <Text style={styles.emptyTextTitle}>Quiet in here.</Text>
          <Text style={styles.emptyTextSub}>Your captured thoughts will drift here once they are saved.</Text>
        </Animated.View>
      ) : (
        <View style={styles.listWrapper}>
          {/* Vertical Timeline Axis - Anchored at the backmost layer */}
          <View style={styles.timelineAxis} />
          
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ArchiveNode 
                note={item} 
                index={index} 
                onPress={handleNotePress} 
                onDelete={handleDeleteNote}
                onSwipeStart={onSwipeStart}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Focus Mode Overlay */}
      <ReadingModal 
        node={selectedNote} 
        onClose={() => setSelectedNote(null)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60, // Space between header and first node
    marginTop: 10,
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#111111',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 4,
    color: '#8E44AD',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    fontWeight: '700',
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
  },
  clearButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E74C3C',
    letterSpacing: 1.5,
  },
  timelineAxis: {
    position: 'absolute',
    left: 40, 
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#EEEEEE',
    zIndex: 0, // Explicitly behind the items
  },
  listWrapper: {
    flex: 1,
    zIndex: 1, // Ensure entire list stays above axis
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyTextTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  emptyTextSub: {
    color: '#BBBBBB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  listContent: {
    paddingBottom: 40,
  },
});
