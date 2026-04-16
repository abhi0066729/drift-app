import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type Note = {
  id: string;
  user_id?: string;
  content: string;
  created_at: number;
  source_type: 'text' | 'voice' | 'url';
  audio_url?: string;
  is_deleted?: number;
  entities_json?: string;
  is_refining?: boolean;
  images?: string[];
  is_ghost?: boolean;
  resonances?: Record<string, number>;
};

interface NotesState {
  notes: Note[];
  studioSeeds: string[];
  pendingSync: string[];
  activeFilters: { person?: string; topic?: string; date?: string };
  theme: 'light' | 'dark';
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  setNotes: (notes: Note[]) => void;
  setFilters: (filters: Partial<NotesState['activeFilters']>) => void;
  clearNotes: () => void;
  deleteNote: (id: string) => void;
  toggleStudioSeed: (id: string) => void;
  toggleTheme: () => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      studioSeeds: [],
      pendingSync: [],
      activeFilters: {},
      theme: 'light',
      addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),
      deleteNote: (id) => set((state) => ({ 
        notes: state.notes.filter((n) => n.id !== id) 
      })),
      setNotes: (notes) => set({ notes }),
      setFilters: (filters) =>
        set((state) => ({ activeFilters: { ...state.activeFilters, ...filters } })),
      clearNotes: () => set({ notes: [], studioSeeds: [] }),
      toggleStudioSeed: (id) => set((state) => ({
        studioSeeds: state.studioSeeds.includes(id)
          ? state.studioSeeds.filter((seedId) => seedId !== id)
          : [...state.studioSeeds, id]
      })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'drift-notes-storage',
      storage: createJSONStorage(() => 
        Platform.OS === 'web' ? window.localStorage : AsyncStorage as any
      ),
    }
  )
);
