import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type PipelineStep = 'idle' | 'queued' | 'embedding' | 'vectorizing' | 'synthesizing' | 'complete' | 'error';

/**
 * Mammoth Scale Note Structure
 * Optimized for local-first database performance.
 */
export type Note = {
  id: string;
  numeric_id?: number;
  user_id?: string;
  content: string;
  created_at: number;
  source_type: 'text' | 'voice' | 'url' | 'synthesis';
  
  // High-performance columns (Queryable in SQLite)
  category: string;
  emotion: string;
  summary?: string;
  embedding_status: 'pending' | 'processing' | 'complete' | 'error';
  synthesis_status: 'pending' | 'processing' | 'complete' | 'error';
  
  // Layout Cache
  layout_x?: number;
  layout_y?: number;
  layout_cluster?: string;
  
  audio_url?: string;
  is_deleted: boolean;
  entities_json?: string;
  is_refining?: boolean;
  
  // Metadata for UI
  resonances?: Record<string, number>;
  room_id?: string;
  wing_id?: string;
  is_ghost?: boolean;
  images?: string[];
  semantic_links?: string[];
  pipeline_step?: PipelineStep;
  pipeline_metrics?: {
    embedding_ms?: number;
    vectorizing_ms?: number;
    synthesis_ms?: number;
    total_ms?: number;
    start_time?: number;
    error_message?: string;
  };
};

interface NotesState {
  // THE VISIBLE PROJECTION
  // In a mammoth knowledge base, we don't store ALL notes in memory.
  // This array stores the currently windowed/filtered set of notes.
  notes: Note[];
  
  lastUpdate: number;
  studioSeeds: string[];
  activeFilters: { person?: string; topic?: string; date?: string; category?: string };
  theme: 'light' | 'dark';
  
  // Actions
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
      lastUpdate: Date.now(),
      studioSeeds: [],
      activeFilters: {},
      theme: 'light',
      
      addNote: (note) => set((state) => ({ 
        notes: [note, ...state.notes],
        lastUpdate: Date.now()
      })),
      
      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
          lastUpdate: Date.now()
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
      // MAMMOTH SCALE FIX: Exclude 'notes' from persistence.
      // SQLite is the source of truth. Hydrating 5000 notes from AsyncStorage blocks the JS thread.
      partialize: (state) => ({
        studioSeeds: state.studioSeeds,
        activeFilters: state.activeFilters,
        theme: state.theme,
        lastUpdate: state.lastUpdate
      }),
    }
  )
);
