import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNotesStore } from '@/store/useNotesStore';
import { ChevronLeft, Zap, Terminal } from 'lucide-react-native';

export default function BulkSynthesisDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const appId = useSettingsStore(state => state.app_id);
  const addNote = useNotesStore(state => state.addNote);
  const updateNote = useNotesStore(state => state.updateNote);

  const [bulkInput, setBulkInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkCommit = async () => {
    if (!bulkInput.trim()) return;

    setIsProcessing(true);
    
    // Split by double newline or semicolon
    const segments = bulkInput
      .split(/\n\n|;/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    if (segments.length === 0) {
      setIsProcessing(false);
      return;
    }

    // Capture Batch Start
    segments.forEach((content, i) => {
      const noteId = Date.now().toString() + i;
      const newNote = {
        id: noteId,
        content,
        created_at: Date.now() - (i * 1000), // Slightly offset for map ordering
        source_type: 'text' as const,
        is_refining: true,
      };
      
      addNote(newNote);

      // Simulate Batch AI Synthesis
      setTimeout(() => {
        // Simple heuristic for demo: If contains '?' it's a study/idea, else journal
        let category = 'Journal';
        if (content.includes('?')) category = 'Idea';
        if (content.length < 30) category = 'Todo';

        updateNote(noteId, {
          is_refining: false,
          entities_json: JSON.stringify({ category })
        });
      }, 2000 + (i * 300));
    });

    setBulkInput('');
    setIsProcessing(false);
    
    Alert.alert(
      "Synthesis Initialized", 
      `${segments.length} thoughts are being integrated into your spatial map.`,
      [{ text: "Go to Map", onPress: () => router.push('/') }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#666" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Terminal size={18} color="#8E44AD" />
          <Text style={styles.headerTitle}>BULK SYNTHESIS CONSOLE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.identityBox}>
          <Text style={styles.label}>INSTANCE IDENTITY (UUID)</Text>
          <Text style={styles.appId}>{appId || 'INITIALIZING...'}</Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.instruction}>
            Paste multiple thoughts below. Separate them with double new-lines or semicolons. 
            The AI engine will automatically compartmentalize them on commit.
          </Text>
          
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="I love the way these nodes pulse; Need to fix the layout glitches tomorrow; What if time was a spatial dimension on the map?"
            placeholderTextColor="#888"
            value={bulkInput}
            onChangeText={setBulkInput}
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={[styles.commitButton, isProcessing && { opacity: 0.5 }]} 
            onPress={handleBulkCommit}
            disabled={isProcessing}
          >
            <Zap size={16} color="#FFF" />
            <Text style={styles.commitText}>INITIALIZE BATCH SYNTHESIS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 22, 
    marginBottom: 30 
  },
  backButton: { marginRight: 16 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: '#8E44AD', 
    letterSpacing: 2,
    marginLeft: 8
  },
  scrollContent: { paddingHorizontal: 22 },
  identityBox: { 
    backgroundColor: '#161616', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#333'
  },
  label: { 
    fontSize: 9, 
    fontWeight: '700', 
    color: '#666', 
    letterSpacing: 1.5, 
    marginBottom: 10 
  },
  appId: { 
    fontFamily: 'monospace', 
    fontSize: 13, 
    color: '#A29BFE', 
    fontWeight: '400' 
  },
  inputSection: { flex: 1 },
  instruction: { 
    fontSize: 13, 
    color: '#999', 
    lineHeight: 20, 
    marginBottom: 20,
    fontWeight: '300' 
  },
  textArea: {
    height: 300,
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 16,
    color: '#EEE',
    fontSize: 16,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  commitButton: {
    backgroundColor: '#8E44AD',
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginLeft: 10,
  },
});
