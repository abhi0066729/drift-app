import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LovableNote } from '@/components/drift/LovableCardBody';

export interface NotesState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  notes: LovableNote[];
  setNotes: (notes: LovableNote[] | ((prev: LovableNote[]) => LovableNote[])) => void;
  addNote: (note: LovableNote) => void;
  updateNote: (id: string, updates: Partial<LovableNote>) => void;
  deleteNote: (id: string) => void;
  boards: string[];
  addBoard: (board: string) => void;
  activeBoard: string | null;
  setActiveBoard: (board: string | null) => void;
}

export const INITIAL_SEEDS: LovableNote[] = [
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

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      notes: INITIAL_SEEDS,
      setNotes: (notesOrFn) =>
        set((state) => ({
          notes:
            typeof notesOrFn === 'function' ? notesOrFn(state.notes) : notesOrFn,
        })),

      addNote: (note) =>
        set((state) => ({
          notes: [...state.notes, note],
        })),

      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        })),

      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),

      boards: ['Inspirations', 'Studio'],
      addBoard: (board) =>
        set((state) => ({
          boards: state.boards.includes(board)
            ? state.boards
            : [...state.boards, board],
        })),

      activeBoard: null,
      setActiveBoard: (board) => set({ activeBoard: board }),
    }),
    {
      name: 'drift-notes-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
