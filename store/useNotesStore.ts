import { create } from 'zustand';

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
};

interface NotesState {
  notes: Note[];
  pendingSync: string[];
  activeFilters: { person?: string; topic?: string; date?: string };
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  setNotes: (notes: Note[]) => void;
  setFilters: (filters: Partial<NotesState['activeFilters']>) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  pendingSync: [],
  activeFilters: {},
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  setNotes: (notes) => set({ notes }),
  setFilters: (filters) =>
    set((state) => ({ activeFilters: { ...state.activeFilters, ...filters } })),
}));
