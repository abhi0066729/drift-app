import * as SQLite from 'expo-sqlite';

export async function initDatabase(db: SQLite.SQLiteDatabase) {
  // Step 0: System Config
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
  `);

  // Step 1: Base Table (Mammoth Scale Optimization)
  // Added direct columns for fast querying instead of parsing JSON
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      numeric_id INTEGER,
      user_id TEXT,
      content TEXT NOT NULL,
      
      -- Mammoth Scale Optimization: Direct Queryable Columns
      category TEXT DEFAULT 'Journal',
      emotion TEXT DEFAULT 'neutral',
      summary TEXT,
      embedding_status TEXT DEFAULT 'pending', -- pending, processing, complete, error
      synthesis_status TEXT DEFAULT 'pending', -- pending, processing, complete, error
      
      created_at INTEGER NOT NULL,
      source_type TEXT NOT NULL, -- user, synthesis, system
      audio_url TEXT,
      is_deleted INTEGER DEFAULT 0,
      entities_json TEXT, -- Still used for flexible metadata
      
      -- Spatial Layout Cache
      layout_x REAL,
      layout_y REAL,
      layout_cluster TEXT,
      layout_version INTEGER DEFAULT 1,
      
      wing_id TEXT,
      room_id TEXT,
      pipeline_step TEXT,
      pipeline_metrics TEXT
    );
    
    -- High Performance Indices
    CREATE INDEX IF NOT EXISTS idx_notes_deleted_created ON notes(is_deleted, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_source ON notes(source_type);
    CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    CREATE INDEX IF NOT EXISTS idx_notes_embedding_status ON notes(embedding_status);
  `);

  // Step 2: Semantic Graph & Persistence
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

  // Step 3: AI Job Queue (Durable Pipeline)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      type TEXT NOT NULL, -- embedding, classification, synthesis
      status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
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
      status TEXT NOT NULL, -- present, missing, corrupted
      updated_at INTEGER NOT NULL
    );
  `);

  // Step 5: Architecture (Wings & Rooms)
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
  `);

  // Step 6: Insights & Resonance
  await db.execAsync(`
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
