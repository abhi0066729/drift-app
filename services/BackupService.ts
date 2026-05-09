import { documentDirectory, cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import { DatabaseService } from './DatabaseService';
import { NoteService } from './NoteService';


export class BackupService {
  private static instance: BackupService;

  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Prepares a portable backup of the entire thought corpus.
   * This includes the SQLite database which contains raw notes AND embeddings.
   */
  public async createBackupPackage(): Promise<string | null> {
    try {
      const dbPath = `${documentDirectory}SQLite/drift.db`;
      const backupPath = `${cacheDirectory}drift_backup_${Date.now()}.db`;

      // 1. Ensure any pending writes are flushed (checkpoint)
      const db = await DatabaseService.getInstance().getDb();
      await db.execAsync('PRAGMA wal_checkpoint(FULL);');

      // 2. Copy the database file
      await copyAsync({
        from: dbPath,
        to: backupPath
      });

      console.log('[BackupService] Backup package created at:', backupPath);
      return backupPath;
    } catch (error) {
      console.error('[BackupService] Backup failed:', error);
      return null;
    }
  }

  /**
   * Restores the database from a backup file.
   * After restore, we trigger an HNSW rebuild because the binary index is not portable.
   */
  public async restoreFromPackage(backupUri: string) {
    try {
      const dbPath = `${documentDirectory}SQLite/drift.db`;
      
      // 1. Overwrite the current DB
      await copyAsync({
        from: backupUri,
        to: dbPath
      });

      console.log('[BackupService] Database restored.');

      // 2. Trigger HNSW Rebuild (Phase 2 feature)
      // This will scan note_embeddings and re-insert into expo-vector-search.
      await this.triggerHNSWRebuild();

      // 3. Refresh the UI
      await NoteService.getInstance().loadAllNotes();
    } catch (error) {
      console.error('[BackupService] Restore failed:', error);
      throw error;
    }
  }

  private async triggerHNSWRebuild() {
    console.log('[BackupService] HNSW Rebuild triggered (Source: note_embeddings table)');
    // TODO: Implement HNSW insertion loop once expo-vector-search is active.
  }
}
