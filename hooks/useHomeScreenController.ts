import { useState, useCallback } from 'react';
import { useNotesStore } from '@/store/useNotesStore';
import { NoteService } from '@/services/NoteService';
import { LovableNote } from '@/components/drift/LovableCardBody';

/**
 * useHomeScreenController
 * Encapsulates all screen-level state, zoom math, view switching,
 * and board/note operations away from the index view.
 */
export function useHomeScreenController() {
  const notes = useNotesStore((state) => state.notes);
  const setNotes = useNotesStore((state) => state.setNotes);
  const boards = useNotesStore((state) => state.boards);

  const [zoom, setZoom] = useState<number>(1);
  const [mode, setMode] = useState<'canvas' | 'list'>('canvas');
  const [focusedNote, setFocusedNote] = useState<LovableNote | null>(null);

  const noteService = NoteService.getInstance();

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)));
  }, []);

  const handleToggleCanvasList = useCallback(() => {
    setMode((m) => (m === 'canvas' ? 'list' : 'canvas'));
  }, []);

  const handleOpenFromList = useCallback((id: string) => {
    const found = useNotesStore.getState().notes.find((n) => n.id === id);
    if (found) setFocusedNote(found);
    setMode('canvas');
  }, []);

  const handleCloseList = useCallback(() => {
    setMode('canvas');
  }, []);

  const handleSelectNote = useCallback((note: LovableNote) => {
    setFocusedNote(note);
  }, []);

  const handleCloseFocus = useCallback(() => {
    setFocusedNote(null);
  }, []);

  const handleMoveToBoard = useCallback((noteId: string, board: string) => {
    noteService.moveToBoard(noteId, board);
    setFocusedNote(null);
  }, [noteService]);

  const handleCreateBoard = useCallback((board: string) => {
    noteService.addBoard(board);
  }, [noteService]);

  const handleDuplicate = useCallback((note: LovableNote) => {
    noteService.duplicateNote(note);
    setFocusedNote(null);
  }, [noteService]);

  const handleRemoveFromStack = useCallback((noteId: string) => {
    noteService.removeFromStack(noteId);
    setFocusedNote(null);
  }, [noteService]);

  const handleDelete = useCallback((noteId: string) => {
    noteService.deleteNote(noteId);
    setFocusedNote(null);
  }, [noteService]);

  return {
    notes,
    setNotes,
    boards,
    zoom,
    mode,
    focusedNote,
    handleZoomIn,
    handleZoomOut,
    handleToggleCanvasList,
    handleOpenFromList,
    handleCloseList,
    handleSelectNote,
    handleCloseFocus,
    handleMoveToBoard,
    handleCreateBoard,
    handleDuplicate,
    handleRemoveFromStack,
    handleDelete,
  };
}
