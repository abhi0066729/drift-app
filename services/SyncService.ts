import { EmbeddingManager } from './EmbeddingManager';
import { NoteService } from './NoteService';
import { DatabaseService } from './DatabaseService';
import { EmbeddingEngine } from './EmbeddingEngine';
import { VectorSearchService } from './VectorSearchService';
import { ModelDownloadService } from './ModelDownloadService';
import { LocalLlamaService } from './LocalLlamaService';
import { ClusteringService } from './ClusteringService';


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
      await DatabaseService.getInstance().getDb();
      await NoteService.getInstance().loadAllNotes();
      
      // 1. Intelligence Check: Model Downloading
      this.notify('downloading', 0.2, 'Verifying Neural Core...');
      const ready = await ModelDownloadService.getInstance().isModelReady();
      if (!ready) {
        await ModelDownloadService.getInstance().ensureModelsPresent((p) => {
          this.notify('downloading', 0.2 + (p.progress * 0.4), `Downloading ${p.fileName}...`);
        });
      }

      // 2. Engine Activation
      this.notify('scanning', 0.7, 'Igniting Semantic Engines...');
      await EmbeddingEngine.getInstance().init();
      await VectorSearchService.getInstance().init();
      await LocalLlamaService.getInstance().init();

      // 3. Thought Synchronization
      this.notify('embedding', 0.8, 'Mapping thought clusters...');
      await EmbeddingManager.getInstance().backfillEmbeddings();

      // 4. Galaxy Rebalancing
      this.notify('physics', 0.9, 'Equilibrating the Nexus...');
      // In Phase 3, this would be a full DBSCAN pass
      
      this.notify('complete', 1.0, 'Palace Ready.');
      console.log('[SyncService] Pre-flight sync complete.');
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
