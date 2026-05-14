import * as SQLite from 'expo-sqlite';

/**
 * BASELINE SCHEMA (Mammoth Scale)
 * This is the "ideal" state of the database for a fresh install.
 * DatabaseService.runMigrations handles upgrading existing installations.
 */
export async function initDatabase(db: SQLite.SQLiteDatabase) {
  // Step 1: Core Note Table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      numeric_id INTEGER,
      user_id TEXT,
      content TEXT NOT NULL,
      
      -- Mammoth Columns (Direct queryable)
      category TEXT DEFAULT 'Journal',
      emotion TEXT DEFAULT 'neutral',
      summary TEXT,
      embedding_status TEXT DEFAULT 'pending',
      synthesis_status TEXT DEFAULT 'pending',
      
      created_at INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      audio_url TEXT,
      is_deleted INTEGER DEFAULT 0,
      is_refining INTEGER DEFAULT 0,
      entities_json TEXT,
      
      -- Spatial Cache
      layout_x REAL,
      layout_y REAL,
      layout_cluster TEXT,
      layout_version INTEGER DEFAULT 1,
      
      wing_id TEXT,
      room_id TEXT,
      pipeline_step TEXT,
      pipeline_metrics TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_notes_deleted_created ON notes(is_deleted, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    CREATE INDEX IF NOT EXISTS idx_notes_embedding_status ON notes(embedding_status);
  `);

  // Step 2: Semantic & Graph Tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS note_embeddings (
      note_id TEXT PRIMARY KEY NOT NULL,
      embedding BLOB NOT NULL,
      model_version TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS semantic_edges (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      strength REAL NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (source_id, target_id),
      FOREIGN KEY (source_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  // Step 3: Intelligence Pipeline
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
  `);

  // Step 4: Asset Tracking
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS model_files (
      name TEXT PRIMARY KEY NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL,
      status TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Step 5: Rooms, Wings, & Resonance
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS thought_wings (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS thought_rooms (
      id TEXT PRIMARY KEY NOT NULL,
      wing_id TEXT NOT NULL,
      title TEXT NOT NULL,
      centroid_embedding BLOB,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (wing_id) REFERENCES thought_wings(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS synthesis_cards (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      trigger_event_id TEXT,
      notes_used TEXT,
      content_json TEXT NOT NULL,
      status TEXT,
      feedback TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resonance_events (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      old_category TEXT,
      new_category TEXT NOT NULL,
      content_peek TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id)
    );
  `);
}
