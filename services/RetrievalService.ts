import { Note } from '../store/useNotesStore';
import { DatabaseService } from './DatabaseService';
import { EmbeddingEngine } from './EmbeddingEngine';
import { VectorSearchService } from './VectorSearchService';

export type DetectedIntent = {
  type: 'EXPLORE' | 'CHRONOS' | 'QUERY';
  query: string;
  filters?: {
    category?: string;
    timeRange?: string;
  };
};

export class RetrievalService {
  private static instance: RetrievalService;

  private constructor() {}

  public static getInstance(): RetrievalService {
    if (!RetrievalService.instance) {
      RetrievalService.instance = new RetrievalService();
    }
    return RetrievalService.instance;
  }

  /**
   * Main entry point for semantic retrieval.
   * Detects intent and routes to the correct HNSW or SQL pipeline.
   */
  public async search(query: string, topK: number = 20): Promise<Note[]> {
    // For now, we route everything to EXPLORE (semantic search)
    return this.executeExplore(query, topK);
  }

  /**
   * Performs the high-performance semantic retrieval (HNSW -> SQLite).
   */
  public async executeExplore(query: string, topK: number = 20): Promise<Note[]> {
    const db = await DatabaseService.getInstance().getDb();
    const queryEmbedding = await EmbeddingEngine.getInstance().embed(query, true);
    
    // PHASE 2: High-Performance HNSW Search
    const results = await VectorSearchService.getInstance().search(queryEmbedding, topK);
    
    if (results.length === 0) return [];

    // 2. Hydrate from SQLite using numeric_id mapping
    const numericIds = results.map(r => r.numericId);
    const placeholders = numericIds.map(() => '?').join(',');
    
    const notes = await db.getAllAsync<Note>(
      `SELECT * FROM notes WHERE numeric_id IN (${placeholders}) AND is_deleted = 0`,
      numericIds
    );

    // Sort by original search distance (closeness)
    const distanceMap = new Map(results.map(r => [r.numericId, r.distance]));
    return notes.sort((a, b) => {
      const distA = distanceMap.get(a.numeric_id!) || 1.0;
      const distB = distanceMap.get(b.numeric_id!) || 1.0;
      return distA - distB;
    });
  }
}
