import { DatabaseService } from './DatabaseService';
import { EmbeddingEngine } from './EmbeddingEngine';
import { VectorSearchService } from './VectorSearchService';

export class EmbeddingManager {
  private static instance: EmbeddingManager;
  private engine: EmbeddingEngine;
  private isProcessing: boolean = false;

  private constructor() {
    this.engine = EmbeddingEngine.getInstance();
  }

  public static getInstance(): EmbeddingManager {
    if (!EmbeddingManager.instance) {
      EmbeddingManager.instance = new EmbeddingManager();
    }
    return EmbeddingManager.instance;
  }

  /**
   * Generates and stores an embedding for a specific note.
   */
  public async processNote(noteId: string, content: string): Promise<void> {
    try {
      console.log(`[EmbeddingManager] Processing note: ${noteId}`);
      const embedding = await this.engine.embed(content, false);
      
      // Convert Float32Array to Uint8Array for BLOB storage
      const blob = new Uint8Array(embedding.buffer);

      const db = await DatabaseService.getInstance().getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO note_embeddings (note_id, embedding, model_version, updated_at) 
         VALUES (?, ?, ?, ?)`,
        [noteId, blob, 'multilingual-e5-small-v1', Date.now()]
      );
      
      console.log(`[EmbeddingManager] Saved embedding for note: ${noteId}`);

      // PHASE 2: Update Vector Search Index
      await VectorSearchService.getInstance().addNote(noteId, embedding);

      // Now calculate semantic edges for this note
      await this.calculateEdges(noteId, embedding);
    } catch (error) {
      console.error(`[EmbeddingManager] Failed to process note ${noteId}:`, error);
    }
  }

  /**
   * Incremental Semantic Edge Calculation
   * Finds the most similar notes and stores them in semantic_edges.
   */
  private async calculateEdges(noteId: string, embedding: Float32Array) {
    try {
      const db = await DatabaseService.getInstance().getDb();
      const allOtherEmbeddings = await db.getAllAsync<{ note_id: string; embedding: Uint8Array }>(
        'SELECT note_id, embedding FROM note_embeddings WHERE note_id != ?',
        [noteId]
      );

      const SIMILARITY_THRESHOLD = 0.65;
      const MAX_EDGES_PER_NOTE = 8;
      const matches: { id: string; similarity: number }[] = [];

      for (const other of allOtherEmbeddings) {
        const otherVector = new Float32Array(other.embedding.buffer, other.embedding.byteOffset, other.embedding.byteLength / 4);
        const similarity = this.cosineSimilarity(embedding, otherVector);

        if (similarity >= SIMILARITY_THRESHOLD) {
          matches.push({ id: other.note_id, similarity });
        }
      }

      // Sort by similarity and take top N
      const topMatches = matches.sort((a, b) => b.similarity - a.similarity).slice(0, MAX_EDGES_PER_NOTE);

      // Store edges (Bidirectional)
      for (const match of topMatches) {
        await db.runAsync(
          `INSERT OR REPLACE INTO semantic_edges (source_id, target_id, similarity, created_at) 
           VALUES (?, ?, ?, ?)`,
          [noteId, match.id, match.similarity, Date.now()]
        );
        await db.runAsync(
          `INSERT OR REPLACE INTO semantic_edges (source_id, target_id, similarity, created_at) 
           VALUES (?, ?, ?, ?)`,
          [match.id, noteId, match.similarity, Date.now()]
        );
      }

      console.log(`[EmbeddingManager] Calculated ${topMatches.length} edges for note: ${noteId}`);
    } catch (error) {
      console.error(`[EmbeddingManager] Edge calculation failed for ${noteId}:`, error);
    }
  }

  private cosineSimilarity(v1: Float32Array, v2: Float32Array): number {
    let dotProduct = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
    }
    return dotProduct;
  }

  /**
   * Scans the database for notes that don't have embeddings and processes them.
   */
  public async backfillEmbeddings(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const db = await DatabaseService.getInstance().getDb();

      // Find notes without embeddings
      const missing = await db.getAllAsync<{ id: string; content: string }>(
        `SELECT id, content FROM notes 
         WHERE id NOT IN (SELECT note_id FROM note_embeddings)
         AND is_deleted = 0`
      );

      console.log(`[EmbeddingManager] Backfilling ${missing.length} notes...`);

      for (const note of missing) {
        await this.processNote(note.id, note.content);
      }

      console.log('[EmbeddingManager] Backfill complete.');
    } catch (error) {
      console.error('[EmbeddingManager] Backfill failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
