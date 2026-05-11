import * as SQLite from 'expo-sqlite';

export async function initDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      numeric_id INTEGER,
      user_id TEXT,
      content TEXT NOT NULL,
      summary_v1 TEXT,
      summary_v2 TEXT,
      created_at INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      audio_url TEXT,
      is_deleted INTEGER DEFAULT 0,
      entities_json TEXT,
      is_refining INTEGER DEFAULT 0,
      wing_id TEXT,
      room_id TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notes_numeric ON notes(numeric_id);
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);

    CREATE TABLE IF NOT EXISTS note_embeddings (
      note_id TEXT PRIMARY KEY NOT NULL,
      embedding BLOB NOT NULL,
      model_version TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS entity_nodes (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- person, place, project, tech
      metadata_json TEXT,
      first_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entity_edges (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      strength REAL DEFAULT 1.0,
      PRIMARY KEY (source_id, target_id, relation_type)
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

    CREATE TABLE IF NOT EXISTS triage_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      source_type TEXT,
      source_ref TEXT,
      priority_score INTEGER,
      date INTEGER,
      completed_at INTEGER
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
