import * as SQLite from 'expo-sqlite';

export async function initDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      audio_url TEXT,
      is_deleted INTEGER DEFAULT 0,
      entities_json TEXT
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
