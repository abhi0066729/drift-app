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

  /**
   * MAMMOTH MIGRATION ENGINE
   * Handles the transition from legacy Drift to the Mammoth Knowledge Base architecture.
   */
  private async runMigrations(db: SQLite.SQLiteDatabase) {
    try {
      await db.execAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER);`);
      
      const result = await db.getFirstAsync<{ version: number }>('SELECT MAX(version) as version FROM schema_migrations');
      const currentVersion = result?.version || 0;

      console.log(`[DatabaseService] Current schema version: ${currentVersion}`);

      // Version 98: Mammoth Architecture (Adding missing is_refining and others)
      if (currentVersion < 98) {
        console.log('[DatabaseService] Applying Mammoth Scale Migration (v98)...');
        
        const migrations = [
          "ALTER TABLE notes ADD COLUMN category TEXT DEFAULT 'Journal'",
          "ALTER TABLE notes ADD COLUMN emotion TEXT DEFAULT 'neutral'",
          "ALTER TABLE notes ADD COLUMN summary TEXT",
          "ALTER TABLE notes ADD COLUMN embedding_status TEXT DEFAULT 'pending'",
          "ALTER TABLE notes ADD COLUMN synthesis_status TEXT DEFAULT 'pending'",
          "ALTER TABLE notes ADD COLUMN is_refining INTEGER DEFAULT 0",
          "ALTER TABLE notes ADD COLUMN layout_x REAL",
          "ALTER TABLE notes ADD COLUMN layout_y REAL",
          "ALTER TABLE notes ADD COLUMN layout_cluster TEXT",
          "ALTER TABLE notes ADD COLUMN layout_version INTEGER DEFAULT 1",
          "ALTER TABLE notes ADD COLUMN pipeline_step TEXT",
          "ALTER TABLE notes ADD COLUMN pipeline_metrics TEXT"
        ];

        for (const sql of migrations) {
          try {
            await db.execAsync(sql);
          } catch (e) {
            // Column might already exist
            console.log(`[DatabaseService] Migration step skipped: ${sql.substring(0, 40)}...`);
          }
        }

        await db.runAsync('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', [98, Date.now()]);
        console.log('[DatabaseService] Migration v98 complete.');
      }
    } catch (error) {
      console.error('[DatabaseService] Migration critical failure:', error);
    }
  }

  public async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[DatabaseService] Opening database instance...');
        const db = await SQLite.openDatabaseAsync('drift.db');
        
        await db.execAsync('PRAGMA foreign_keys = ON;');
        await db.execAsync('PRAGMA journal_mode = WAL;');
        
        // 1. Ensure baseline tables exist
        await initDatabase(db);
        
        // 2. Run structural migrations
        await this.runMigrations(db);
        
        this.db = db;
        console.log('[DatabaseService] Database heartbeat active.');
        return db;
      } catch (e) {
        console.error('[DatabaseService] Failed to initialize database:', e);
        throw e;
      }
    })();

    return this.initPromise;
  }

  public static async updateNoteMetadata(db: SQLite.SQLiteDatabase, id: string, entitiesJson: string) {
    await db.runAsync('UPDATE notes SET entities_json = ? WHERE id = ?', [entitiesJson, id]);
  }
}
