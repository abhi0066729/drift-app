import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import Animated, { FadeIn } from 'react-native-reanimated';
import ArchiveNode from '@/components/ArchiveNode';
import ReadingModal from '@/components/ReadingModal';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore((state) => state.notes);
  const clearNotes = useNotesStore((state) => state.clearNotes);
  const [selectedNote, setSelectedNote] = useState<any>(null);

  const handleClear = () => {
    Alert.alert(
      "Clear Archive",
      "Are you sure you want to delete all entries? This action is immediate and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Everything", style: "destructive", onPress: clearNotes }
      ]
    );
  };

  const handleNotePress = (note: any) => {
    setSelectedNote(note);
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
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ArchiveNode 
              note={item} 
              index={index} 
              onPress={handleNotePress} 
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
    alignItems: 'baseline',
    marginBottom: 32,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
  },
  clearButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: 1.5,
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
