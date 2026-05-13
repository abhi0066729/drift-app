import * as SQLite from 'expo-sqlite';
import { initDatabase } from '../db/schema';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async runMigrations(db: SQLite.SQLiteDatabase) {
    try {
      // 1. Ensure migrations table exists
      await db.execAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER);`);
      
      const result = await db.getFirstAsync<{ version: number }>('SELECT MAX(version) as version FROM schema_migrations');
      const currentVersion = result?.version || 0;

      console.log(`[DatabaseService] Current schema version: ${currentVersion}`);

      // Future migrations will go here
      // For now, we are at baseline (version 1)
      if (currentVersion === 0) {
        await db.runAsync('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [1, Date.now()]);
      }

      // Migration v3: Add pipeline columns to notes
      if (currentVersion < 3) {
        try {
          await db.execAsync('ALTER TABLE notes ADD COLUMN pipeline_step TEXT;');
          await db.execAsync('ALTER TABLE notes ADD COLUMN pipeline_metrics TEXT;');
          await db.runAsync('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [3, Date.now()]);
          console.log('[DatabaseService] Migration v3 (pipeline columns) applied.');
        } catch (e) {
          console.log('[DatabaseService] Migration v3 failed:', e);
        }
      }
    } catch (error) {
      console.error('[DatabaseService] Migration failed:', error);
    }
  }

  public async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      console.log('[DatabaseService] Opening database...');
      const db = await SQLite.openDatabaseAsync('drift.db');
      
      // Force foreign keys for all connections
      await db.execAsync('PRAGMA foreign_keys = ON;');
      
      await initDatabase(db);
      await this.runMigrations(db);
      
      this.db = db;
      console.log('[DatabaseService] Database ready.');
      return db;
    })();

    return this.initPromise;
  }

  /**
   * Helper to update note metadata (entities_json) directly in SQLite.
   */
  public static async updateNoteMetadata(db: SQLite.SQLiteDatabase, id: string, entitiesJson: string) {
    await db.runAsync('UPDATE notes SET entities_json = ? WHERE id = ?', [entitiesJson, id]);
  }
}
