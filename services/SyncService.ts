import { EmbeddingManager } from './EmbeddingManager';
import { NoteService } from './NoteService';
import { DatabaseService } from './DatabaseService';
import { ClusteringService } from './ClusteringService';
import { VectorSearchService } from './VectorSearchService';
import { ModelDownloadService } from './ModelDownloadService';

const getLlama = () => require('./LocalLlamaService').LocalLlamaService.getInstance();
const getEmbed = () => require('./EmbeddingEngine').EmbeddingEngine.getInstance();


export type SyncProgress = {
  status: 'idle' | 'scanning' | 'downloading' | 'embedding' | 'clustering' | 'physics' | 'complete';
  progress: number; // 0 to 1
  message: string;
};

export class SyncService {
  private static instance: SyncService;
  private isSyncing: boolean = false;
  private progressCallback: ((progress: SyncProgress) => void) | null = null;

  private constructor() {}

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public onProgress(callback: (progress: SyncProgress) => void) {
    this.progressCallback = callback;
  }

  /**
   * THE PRE-FLIGHT SYNC
   * Runs the heavy intelligence pipeline during the loading screen.
   */
  public async performFullSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      this.notify('scanning', 0.1, 'Waking up the cortex...');
      
      // 0. Initialize Foundations
      const db = await DatabaseService.getInstance().getDb();
      
      // Cleanup: Purge legacy synthesis nodes to prevent map pollution
      await db.runAsync("DELETE FROM notes WHERE source_type = 'synthesis'");
      
      await NoteService.getInstance().loadVisibleNotes(100);
      
      // 1. Intelligence Check: Model Downloading Only
      this.notify('downloading', 0.2, 'Verifying Neural Core...');
      const ready = await ModelDownloadService.getInstance().isModelReady();
      if (!ready) {
        await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
          this.notify('downloading', 0.2 + (p.progress * 0.4), `Downloading ${p.fileName}...`);
        });
      }

      // 2. MAMMOTH SCALE: Intelligence activation is now handled 
      // by the AIJobScheduler in the background.
      this.notify('complete', 1.0, 'Palace Ready.');
      console.log('[SyncService] Startup verification complete.');
      
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      this.notify('idle', 0, 'Sync interrupted. Retrying...');
    } finally {
      this.isSyncing = false;
    }
  }

  private notify(status: SyncProgress['status'], progress: number, message: string) {
    if (this.progressCallback) {
      this.progressCallback({ status, progress, message });
    }
  }
}
