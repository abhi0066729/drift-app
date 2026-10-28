import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotesStore } from '@/store/useNotesStore';
import { NoteService } from '@/services/NoteService';
import { AmbientMeshBackground } from '@/components/AmbientMeshBackground';
import { LovableNote } from '@/components/drift/LovableCardBody';
import { LovableHeader } from '@/components/drift/LovableHeader';
import { LovableCanvasView } from '@/components/drift/LovableCanvasView';
import { LovableListView } from '@/components/drift/LovableListView';
import { LovableFocusModal } from '@/components/drift/LovableFocusModal';
import { LovableZoomControls } from '@/components/drift/LovableZoomControls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Seed data from Lovable specification adapted to mobile viewport
const INITIAL_SEEDS: LovableNote[] = [
  {
    id: '1',
    type: 'text',
    x: 40,
    y: 180,
    title: 'Slow mornings',
    body: 'Ideas arrive when nothing is asked of them. Keep a pocket of quiet each day.',
  },
  {
    id: '2',
    type: 'image',
    x: 320,
    y: 160,
    title: 'Lake, 6:04am',
    img: 'lake',
  },
  {
    id: '3',
    type: 'audio',
    x: 40,
    y: 470,
    title: 'Melody idea',
  },
  {
    id: '4',
    type: 'map',
    x: 320,
    y: 480,
    title: 'Kyoto tea house',
    body: '35.0116° N, 135.7681° E',
  },
  {
    id: '5',
    type: 'todo',
    x: 40,
    y: 770,
    title: 'Studio list',
    body: 'Linen swatches|Call the framer|Film for Contax',
  },
  {
    id: '6',
    type: 'image',
    x: 320,
    y: 790,
    title: 'Still life',
    img: 'vase',
  },
];

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const theme = useNotesStore((state) => state.theme);
  const projects = useNotesStore((state) => state.projects);
  const addProject = useNotesStore((state) => state.addProject);
  const dbNotes = useNotesStore((state) => state.notes);

  const [notes, setNotes] = useState<LovableNote[]>(INITIAL_SEEDS);
  const [zoom, setZoom] = useState<number>(1);
  const [mode, setMode] = useState<'canvas' | 'list'>('canvas');
  const [focusedNote, setFocusedNote] = useState<LovableNote | null>(null);
  const [boards, setBoards] = useState<string[]>(projects.length > 0 ? projects : ['Inspirations', 'Studio']);

  // Sync boards with project store
  useEffect(() => {
    if (projects.length > 0) {
      setBoards(projects);
    }
  }, [projects]);

  // Convert SQLite database notes into visual Lovable cards if available
  useEffect(() => {
    if (dbNotes && dbNotes.length > 0) {
      const converted: LovableNote[] = dbNotes.slice(0, 15).map((n, idx) => {
        let cardType: LovableNote['type'] = 'text';
        if (n.source_type === 'voice') cardType = 'audio';
        else if (n.category === 'Tasks') cardType = 'todo';
        else if (n.category === 'Travel') cardType = 'map';

        const row = Math.floor(idx / 2);
        const col = idx % 2;

        return {
          id: n.id,
          type: cardType,
          x: 40 + col * 280,
          y: 180 + row * 290,
          title: n.category ? n.category.toUpperCase() : 'NOTE',
          body: n.content,
          board: n.room_id || undefined,
        };
      });

      // Merge seeds with user notes ensuring unique IDs
      const seedIds = new Set(INITIAL_SEEDS.map((s) => s.id));
      const filteredConverted = converted.filter((c) => !seedIds.has(c.id));
      setNotes([...INITIAL_SEEDS, ...filteredConverted]);
    }
  }, [dbNotes]);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)));
  };

  // Card select/modal handlers
  const handleCardPress = (note: LovableNote) => {
    setFocusedNote(note);
  };

  const handleCloseFocus = () => {
    setFocusedNote(null);
  };

  // Board actions
  const handleMoveToBoard = (noteId: string, boardName: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, board: boardName } : n))
    );
    try {
      NoteService.getInstance().updateNote(noteId, { room_id: boardName });
    } catch (_) {}
    setFocusedNote(null);
  };

  const handleCreateBoard = (boardName: string) => {
    if (!boards.includes(boardName)) {
      setBoards((prev) => [...prev, boardName]);
      addProject(boardName);
    }
  };

  const handleDuplicate = (note: LovableNote) => {
    const newNote: LovableNote = {
      ...note,
      id: `copy_${Date.now()}`,
      x: note.x + 30,
      y: note.y + 30,
      stack: undefined,
    };
    setNotes((prev) => [...prev, newNote]);
    setFocusedNote(null);
  };

  const handleRemoveFromStack = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, stack: undefined, x: n.x + 40, y: n.y + 40 } : n
      )
    );
    setFocusedNote(null);
  };

  const handleDelete = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    try {
      NoteService.getInstance().deleteNote(noteId);
    } catch (_) {}
    setFocusedNote(null);
  };

  return (
    <View style={styles.container}>
      {/* 1. Atmospheric Ambient Background */}
      <AmbientMeshBackground />

      {/* 2. Top Header HUD */}
      <View style={[styles.headerContainer, { top: insets.top + 8 }]} pointerEvents="box-none">
        <LovableHeader
          notesCount={notes.length}
          onPressAllNotes={() => setMode('list')}
        />
      </View>

      {/* 3. Infinite Spatial Canvas */}
      <LovableCanvasView
        notes={notes}
        zoom={zoom}
        onSelectNote={handleCardPress}
        onDoubleTapCanvas={() => setMode((m) => (m === 'canvas' ? 'list' : 'canvas'))}
        onNotesChange={setNotes}
      />

      {/* 4. Zoom Controls HUD (Above Bottom Bar) */}
      <LovableZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        bottomOffset={24 + insets.bottom}
      />

      {/* 5. List View Overlay (Triggered by double tap or HUD) */}
      {mode === 'list' && (
        <LovableListView
          notes={notes}
          onOpen={(id) => {
            const found = notes.find((n) => n.id === id);
            if (found) setFocusedNote(found);
            setMode('canvas');
          }}
          onClose={() => setMode('canvas')}
        />
      )}

      {/* 6. Focus & Moodboards Management Modal */}
      <LovableFocusModal
        note={focusedNote}
        boards={boards}
        onClose={handleCloseFocus}
        onMoveToBoard={handleMoveToBoard}
        onCreateBoard={handleCreateBoard}
        onDuplicate={handleDuplicate}
        onRemoveFromStack={handleRemoveFromStack}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D9D5E1',
  },
  headerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
