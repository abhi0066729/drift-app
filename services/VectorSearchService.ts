import { VectorIndex } from 'expo-vector-search';
// @ts-ignore
import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { DatabaseService } from './DatabaseService';
import { hashUUIDToNumber } from '../utils/idUtils';

class AsyncLock {
  private promise: Promise<any> = Promise.resolve();

  public async acquire(): Promise<() => void> {
    let release: () => void;
    const nextPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    const currentPromise = this.promise;
    this.promise = currentPromise.then(() => nextPromise).catch(() => nextPromise);
    await currentPromise;
    return release!;
  }
}

export class VectorSearchService {
  private static instance: VectorSearchService;
  private index: VectorIndex | null = null;
  private indexName = 'drift_hnsw.bin';
  private dimensions = 384; 
  private isLoaded = false;
  private initPromise: Promise<void> | null = null;
  private lock = new AsyncLock();

  private constructor() {}

  public static getInstance(): VectorSearchService {
    if (!VectorSearchService.instance) {
      VectorSearchService.instance = new VectorSearchService();
    }
    return VectorSearchService.instance;
  }

  public async init() {
    if (this.isLoaded) return;
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    await this.initPromise;
  }

  private async doInit() {
    try {
      const indexPath = `${documentDirectory}SQLite/${this.indexName}`;
      const exists = await getInfoAsync(indexPath);

      // Initialize the native index object
      this.index = new VectorIndex(this.dimensions, { metric: 'cos' });

      if (exists.exists) {
        console.log('[VectorSearchService] Loading HNSW index from:', indexPath);
        this.index.load(indexPath);
      } else {
        console.log('[VectorSearchService] Creating new HNSW index...');
        await this._rebuildFromDatabase();
      }

      this.isLoaded = true;
    } catch (error) {
      console.error('[VectorSearchService] Initialization failed:', error);
      // Fallback: start fresh
      this.index = new VectorIndex(this.dimensions, { metric: 'cos' });
      this.isLoaded = true;
    }
  }

  public async addNote(noteId: string, embedding: Float32Array) {
    if (!this.isLoaded) await this.init();

    const release = await this.lock.acquire();
    try {
      if (!this.index) return;
      const numericId = hashUUIDToNumber(noteId);
      this.index.add(numericId, embedding);
      
      const indexPath = `${documentDirectory}SQLite/${this.indexName}`;
      this.index.save(indexPath);
    } catch (error) {
      console.error('[VectorSearchService] Failed to add note:', error);
    } finally {
      release();
    }
  }

  public async search(queryVector: Float32Array, topK: number = 20) {
    if (!this.isLoaded) await this.init();

    const release = await this.lock.acquire();
    try {
      if (!this.index || this.index.count === 0) return [];
      const k = Math.min(topK, this.index.count);
      if (k <= 0) return [];
      
      const results = this.index.search(queryVector, k);
      return results.map(r => ({
        numericId: r.key,
        distance: r.distance
      }));
    } catch (error) {
      console.error('[VectorSearchService] Search failed:', error);
      return [];
    } finally {
      release();
    }
  }

  public async rebuildFromDatabase() {
    const release = await this.lock.acquire();
    try {
      await this._rebuildFromDatabase();
    } finally {
      release();
    }
  }

  private async _rebuildFromDatabase() {
    if (!this.index) this.index = new VectorIndex(this.dimensions, { metric: 'cos' });

    console.log('[VectorSearchService] Rebuilding HNSW from SQLite...');
    const db = await DatabaseService.getInstance().getDb();
    const allEmbeddings = await db.getAllAsync<{ note_id: string; embedding: Uint8Array }>(
      'SELECT note_id, embedding FROM note_embeddings'
    );

    for (const row of allEmbeddings) {
      const numericId = hashUUIDToNumber(row.note_id);
      const vector = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
      this.index.add(numericId, vector);
    }

    const indexPath = `${documentDirectory}SQLite/${this.indexName}`;
    this.index.save(indexPath);
    console.log(`[VectorSearchService] Rebuilt index with ${allEmbeddings.length} notes.`);
  }

  public async unload() {
    const release = await this.lock.acquire();
    try {
      if (this.index) {
        this.index.delete();
        this.index = null;
      }
      this.isLoaded = false;
      this.initPromise = null;
    } finally {
      release();
    }
  }
}

