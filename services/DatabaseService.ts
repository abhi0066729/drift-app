import * as SQLite from 'expo-sqlite';

/**
 * DatabaseService: Handles offline-first note persistence in the local SQLite DB.
 */
export const DatabaseService = {
  /**
   * Updates a note's spectral metadata and primary category.
   */
  updateNoteMetadata: async (db: SQLite.SQLiteDatabase, noteId: string, entitiesJson: string) => {
    try {
      const result = await db.runAsync(
        'UPDATE notes SET entities_json = ? WHERE id = ?',
        [entitiesJson, noteId]
      );
      if (result.changes > 0) {
        console.log(`[DatabaseService] SUCCESS: Note ${noteId} metadata permanently persisted.`);
      } else {
        console.warn(`[DatabaseService] WARNING: No note found with ID ${noteId} to update.`);
      }
    } catch (error) {
      console.error('[DatabaseService] CRITICAL: Failed to update note metadata in SQLite:', error);
    }
  },

  /**
   * (Utility) Fetches total counts from resonance_events for future training.
   */
  getEventCount: async (db: SQLite.SQLiteDatabase) => {
    try {
      const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM resonance_events');
      return result?.count || 0;
    } catch (e) { return 0; }
  }
};
