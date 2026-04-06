import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import { NightTheme } from '@/constants/theme';
import { extractPeopleFromNotes, Person, generateSeedPeopleNotes, getPeopleConnections } from '@/utils/peopleUtils';
import { SocialMatrix, EmptyMatrixState } from '@/components/SocialMatrix';
import ThoughtCloud from '@/components/ThoughtCloud';
import * as Haptics from 'expo-haptics';
import { Note } from '@/store/useNotesStore';

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const notes = useNotesStore(state => state.notes);
  const theme = useNotesStore(state => state.theme);
  const addNote = useNotesStore(state => state.addNote);
  
  const [selectedPerson, setSelectedPerson] = React.useState<Person | null>(null);

  const people = React.useMemo(() => extractPeopleFromNotes(notes), [notes]);
  const connections = React.useMemo(() => getPeopleConnections(notes, people), [notes, people]);
  
  const personNotes = React.useMemo(() => {
    if (!selectedPerson) return [];
    return notes.filter(n => selectedPerson.noteIds.includes(n.id));
  }, [selectedPerson, notes]);

  const handleSeed = () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch(e){}
    const seedNotes = generateSeedPeopleNotes();
    seedNotes.forEach((n: Note) => addNote(n));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: theme === 'dark' ? NightTheme.background : '#FFFFFF' }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.header, { color: theme === 'dark' ? NightTheme.textPrimary : '#111111' }]}>Drift Directory</Text>
          <Text style={styles.headerSubtitle}>RESONANCE ORBIT</Text>
        </View>
        {people.length > 0 && (
          <Pressable onPress={handleSeed} style={styles.miniSeedBtn}>
            <Text style={styles.miniSeedText}>+ SEED</Text>
          </Pressable>
        )}
      </View>
      
      {people.length === 0 ? (
        <EmptyMatrixState onSeed={handleSeed} theme={theme} />
      ) : (
        <View style={styles.matrixWrapper}>
          <SocialMatrix 
            people={people} 
            connections={connections}
            onPersonPress={setSelectedPerson} 
            theme={theme} 
          />
        </View>
      )}

      <ThoughtCloud 
        person={selectedPerson}
        notes={personNotes}
        onClose={() => setSelectedPerson(null)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  header: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 4,
    color: '#8E44AD',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    fontWeight: '700',
    marginBottom: 24,
  },
  miniSeedBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 68, 173, 0.1)',
  },
  miniSeedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E44AD',
  },
  matrixWrapper: {
    flex: 1,
    marginHorizontal: -24, // Allow it to bleed to edges for radial sweep
  },
});

