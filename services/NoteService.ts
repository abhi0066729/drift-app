import { LovableNote } from '@/components/drift/LovableCardBody';
import { useNotesStore } from '@/store/useNotesStore';

/**
 * NoteService
 * Handles note operations and persistence dispatch.
 * Keeps business logic separated from the index / home view.
 */
export class NoteService {
  private static instance: NoteService;

  public static getInstance(): NoteService {
    if (!NoteService.instance) {
      NoteService.instance = new NoteService();
    }
    return NoteService.instance;
  }

  public getNotes(): LovableNote[] {
    return useNotesStore.getState().notes;
  }

  public addNote(note: LovableNote): void {
    useNotesStore.getState().addNote(note);
  }

  public updateNote(id: string, updates: Partial<LovableNote>): void {
    useNotesStore.getState().updateNote(id, updates);
  }

  public deleteNote(id: string): void {
    useNotesStore.getState().deleteNote(id);
  }

  public moveToBoard(noteId: string, boardName: string): void {
    useNotesStore.getState().updateNote(noteId, { board: boardName });
  }

  public duplicateNote(note: LovableNote): LovableNote {
    const duplicated: LovableNote = {
      ...note,
      id: `copy_${Date.now()}`,
      x: note.x + 30,
      y: note.y + 30,
      stack: undefined,
    };
    useNotesStore.getState().addNote(duplicated);
    return duplicated;
  }

  public removeFromStack(noteId: string): void {
    const note = useNotesStore.getState().notes.find((n) => n.id === noteId);
    if (note) {
      useNotesStore.getState().updateNote(noteId, {
        stack: undefined,
        x: note.x + 40,
        y: note.y + 40,
      });
    }
  }

  public addBoard(boardName: string): void {
    useNotesStore.getState().addBoard(boardName);
  }
}
