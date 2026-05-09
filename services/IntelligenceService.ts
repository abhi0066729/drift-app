import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export interface ResonanceEvent {
  noteId: string;
  oldCategory?: string;
  newCategory: string;
  content: string;
}

/**
 * IntelligenceService: Captures user interaction data to build 
 * a behavioral training set for future AI categorization learning.
 */
export const IntelligenceService = {
  /**
   * Logs a manual re-categorization event to the SQLite database.
   */
  logResonanceEvent: async (db: SQLite.SQLiteDatabase, event: ResonanceEvent) => {
    const { noteId, oldCategory, newCategory, content } = event;
    const eventId = Crypto.randomUUID();
    const timestamp = Date.now();
    const contentPeek = content.substring(0, 100); // Store a peek for contextual learning

    try {
      await db.runAsync(
        'INSERT INTO resonance_events (id, note_id, old_category, new_category, content_peek, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [eventId, noteId, oldCategory || null, newCategory, contentPeek, timestamp]
      );
      console.log(`[IntelligenceService] Logged resonance event: ${newCategory} (Note: ${noteId})`);
    } catch (error) {
      console.error('[IntelligenceService] Failed to log resonance event:', error);
    }
  }
};
