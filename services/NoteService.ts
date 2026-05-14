import { Note, useNotesStore } from '../store/useNotesStore';
import { DatabaseService } from './DatabaseService';
import { hashUUIDToNumber } from '../utils/idUtils';
import * as Crypto from 'expo-crypto';

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
   * MAMMOTH SCALE: Windowed Load
   * Loads a limited set of notes from SQLite for display.
   * Prevents loading the entire 50k+ corpus into RAM.
   */
  public async loadVisibleNotes(limit: number = 100, offset: number = 0) {
    try {
      const db = await DatabaseService.getInstance().getDb();
      const notes = await db.getAllAsync<any>(
        `SELECT * FROM notes 
         WHERE is_deleted = 0 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const mappedNotes: Note[] = notes.map(n => ({
        ...n,
        is_deleted: !!n.is_deleted,
        is_refining: !!n.is_refining,
        // Metrics parsing only if needed
        pipeline_metrics: n.pipeline_metrics ? JSON.parse(n.pipeline_metrics) : undefined
      }));

      // In a mammoth app, setNotes only updates the "current view"
      useNotesStore.getState().setNotes(mappedNotes);
      console.log(`[NoteService] Loaded ${mappedNotes.length} visible notes (Offset: ${offset}).`);
    } catch (error) {
      console.error('[NoteService] Failed to load notes:', error);
    }
  }

  /**
   * MAMMOTH SCALE: Durable Save
   * Saves to SQLite and enqueues background intelligence jobs.
   * Does NOT block the UI with AI processing.
   */
  public async saveNote(note: Note) {
    try {
      // 1. Optimistic UI Update: Show the note instantly in the Drift Palace
      useNotesStore.getState().addNote(note);

      const db = await DatabaseService.getInstance().getDb();
      const numericId = note.numeric_id || hashUUIDToNumber(note.id);

      // 2. Direct SQLite Persistence (Source of Truth)
      await db.runAsync(
        `INSERT OR REPLACE INTO notes (
          id, numeric_id, user_id, content, created_at, source_type, 
          category, emotion, summary, embedding_status, synthesis_status,
          is_deleted, entities_json, is_refining, wing_id, room_id,
          pipeline_step, pipeline_metrics
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.id, 
          numericId,
          note.user_id || null, 
          note.content, 
          note.created_at, 
          note.source_type, 
          note.category || 'Journal',
          note.emotion || 'neutral',
          note.summary || null,
          note.embedding_status || 'pending',
          note.synthesis_status || 'pending',
          note.is_deleted ? 1 : 0, 
          note.entities_json || null,
          note.is_refining ? 1 : 0,
          note.wing_id || null,
          note.room_id || null,
          note.pipeline_step || 'idle',
          note.pipeline_metrics ? JSON.stringify(note.pipeline_metrics) : null
        ]
      );


      // 3. Enqueue Durable AI Jobs
      if (note.embedding_status === 'pending') {
        await this.enqueueAIJob(note.id, 'embedding');
      }
      
      // We automatically queue metadata refinement for new notes
      await this.enqueueAIJob(note.id, 'classification');

      console.log(`[NoteService] Note ${note.id} persisted and intelligence enqueued.`);
    } catch (error) {
      console.error('[NoteService] Failed to save note:', error);
    }
  }

  private async enqueueAIJob(noteId: string, type: 'embedding' | 'classification' | 'synthesis') {
    try {
      const db = await DatabaseService.getInstance().getDb();
      const jobId = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO ai_jobs (id, note_id, type, status, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?)`,
        [jobId, noteId, type, Date.now(), Date.now()]
      );
    } catch (e) {
      console.error(`[NoteService] Failed to enqueue ${type} job for ${noteId}:`, e);
    }
  }

  public async updateNote(id: string, updates: Partial<Note>) {
    try {
      const db = await DatabaseService.getInstance().getDb();
      const setClauses: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        // Map boolean to integer for SQLite
        let finalValue = value;
        if (typeof value === 'boolean') finalValue = value ? 1 : 0;
        if (typeof value === 'object' && value !== null) finalValue = JSON.stringify(value);

        setClauses.push(`${key} = ?`);
        values.push(finalValue);
      });

      if (setClauses.length > 0) {
        values.push(id);
        const query = `UPDATE notes SET ${setClauses.join(', ')} WHERE id = ?`;
        await db.runAsync(query, values);
      }
      
      useNotesStore.getState().updateNote(id, updates);
    } catch (error) {
      console.error('[NoteService] Failed to update note:', error);
    }
  }

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
