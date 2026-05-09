import { Note, useNotesStore } from '../store/useNotesStore';
import { DatabaseService } from './DatabaseService';
import { EmbeddingManager } from './EmbeddingManager';
import { hashUUIDToNumber } from '../utils/idUtils';
import { ClusteringService } from './ClusteringService';




export class NoteService {
  private static instance: NoteService;

  private constructor() {}

  public static getInstance(): NoteService {
    if (!NoteService.instance) {
      NoteService.instance = new NoteService();
    }
    return NoteService.instance;
  }

  /**
   * Loads all notes from SQLite and updates the global store.
   */
  public async loadAllNotes() {
    try {
      const db = await DatabaseService.getInstance().getDb();
      const notes = await db.getAllAsync<Note>(
        'SELECT * FROM notes WHERE is_deleted = 0 ORDER BY created_at DESC'
      );
      useNotesStore.getState().setNotes(notes);
      console.log(`[NoteService] Loaded ${notes.length} notes from database.`);
    } catch (error) {
      console.error('[NoteService] Failed to load notes:', error);
    }
  }

  /**
   * Saves a note to both SQLite and the global store, then triggers AI processing.
   */
  public async saveNote(note: Note) {
    try {
      const db = await DatabaseService.getInstance().getDb();
      
      // 1. Save to SQLite
      const numericId = hashUUIDToNumber(note.id);

      await db.runAsync(
        `INSERT OR REPLACE INTO notes (
          id, numeric_id, user_id, content, created_at, source_type, audio_url, is_deleted, entities_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.id, 
          numericId,
          note.user_id || null, 
          note.content, 
          note.created_at, 
          note.source_type, 
          note.audio_url || null, 
          note.is_deleted || 0, 
          note.entities_json || null
        ]
      );


      // 2. Update Zustand Store
      const existing = useNotesStore.getState().notes.find(n => n.id === note.id);
      if (existing) {
        useNotesStore.getState().updateNote(note.id, note);
      } else {
        useNotesStore.getState().addNote(note);
      }

      // 3. Trigger Embedding Generation (Background)
      EmbeddingManager.getInstance().processNote(note.id, note.content);

      // 4. Trigger Galaxy Rebalancing
      if (note.room_id) {
        ClusteringService.getInstance().evaluateRoomStability(note.room_id);
      }

      console.log(`[NoteService] Note ${note.id} saved and queued for embedding.`);
    } catch (error) {
      console.error('[NoteService] Failed to save note:', error);
    }
  }

  /**
   * Marks a note as deleted in SQLite and removes from store.
   */
  public async deleteNote(id: string) {
    try {
      const db = await DatabaseService.getInstance().getDb();
      await db.runAsync('UPDATE notes SET is_deleted = 1 WHERE id = ?', [id]);
      useNotesStore.getState().deleteNote(id);
    } catch (error) {
      console.error('[NoteService] Failed to delete note:', error);
    }
  }
}
