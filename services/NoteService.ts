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
      const notes = await db.getAllAsync<any>(
        'SELECT * FROM notes WHERE is_deleted = 0 ORDER BY created_at DESC'
      );
      const mappedNotes: Note[] = notes.map(n => ({
        ...n,
        is_refining: !!n.is_refining,
        is_deleted: !!n.is_deleted
      }));
      useNotesStore.getState().setNotes(mappedNotes);
      console.log(`[NoteService] Loaded ${mappedNotes.length} notes from database.`);
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
          id, numeric_id, user_id, content, created_at, source_type, audio_url, is_deleted, entities_json, is_refining
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.id, 
          numericId,
          note.user_id || null, 
          note.content, 
          note.created_at, 
          note.source_type, 
          note.audio_url || null, 
          note.is_deleted ? 1 : 0, 
          note.entities_json || null,
          note.is_refining ? 1 : 0
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
   * Updates a note's content and metadata.
   */
  public async updateNote(id: string, updates: Partial<Note>) {
    try {
      const db = await DatabaseService.getInstance().getDb();
      
      const setClauses: string[] = [];
      const values: any[] = [];

      if (updates.content !== undefined) {
        setClauses.push('content = ?');
        values.push(updates.content);
      }
      if (updates.entities_json !== undefined) {
        setClauses.push('entities_json = ?');
        values.push(updates.entities_json);
      }
      if (updates.is_refining !== undefined) {
        setClauses.push('is_refining = ?');
        values.push(updates.is_refining ? 1 : 0);
      }

      if (setClauses.length > 0) {
        values.push(id);
        const query = `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`;
        await db.runAsync(query, values);
      }
      
      console.log(`[NoteService] Note ${id} updated in database.`);
    } catch (error) {
      console.error('[NoteService] Failed to update note:', error);
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
