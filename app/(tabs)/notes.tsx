import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore((state) => state.notes);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.header}>All Notes</Text>
      
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You haven't captured any notes yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.noteCard}>
              <Text style={styles.noteContent}>{item.content}</Text>
              <Text style={styles.noteDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0e8',
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1a1814',
    marginBottom: 24,
    fontFamily: 'serif',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#7a756b',
    fontSize: 15,
  },
  noteCard: {
    backgroundColor: '#ede8dc',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(26,24,20,0.12)',
    marginBottom: 16,
  },
  noteContent: {
    fontSize: 16,
    color: '#1a1814',
    fontFamily: 'serif',
    lineHeight: 24,
    marginBottom: 12,
  },
  noteDate: {
    fontSize: 11,
    color: '#7a756b',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
});
