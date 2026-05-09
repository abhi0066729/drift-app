import { DatabaseService } from './DatabaseService';
import { EmbeddingEngine } from './EmbeddingEngine';

export type ClusterResult = {
  roomId: string;
  count: number;
  centroid?: number[];
};

export class ClusteringService {
  private static instance: ClusteringService;
  
  // Thermodynamic Constants
  private readonly MAX_ROOM_ENERGY = 12; // Notes before a supernova occurs
  private readonly SIMILARITY_THRESHOLD = 0.72;

  private constructor() {}

  public static getInstance(): ClusteringService {
    if (!ClusteringService.instance) {
      ClusteringService.instance = new ClusteringService();
    }
    return ClusteringService.instance;
  }

  /**
   * Evaluates if the current room is stable or needs to undergo a Supernova (split).
   */
  public async evaluateRoomStability(roomId: string): Promise<boolean> {
    const db = await DatabaseService.getInstance().getDb();
    
    // Count active notes in this room
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE room_id = ? AND is_deleted = 0',
      [roomId]
    );

    const count = result?.count || 0;
    console.log(`[ClusteringService] Room ${roomId} energy level: ${count}/${this.MAX_ROOM_ENERGY}`);

    if (count >= this.MAX_ROOM_ENERGY) {
      console.log(`[ClusteringService] Room ${roomId} critical energy reached. Triggering Supernova...`);
      await this.performSupernova(roomId);
      return true;
    }

    return false;
  }

  /**
   * Supernova: Splits a crowded room into two new clusters using a simple k-means or similarity split.
   * In a production app, we would use DBSCAN here.
   */
  private async performSupernova(roomId: string) {
    const db = await DatabaseService.getInstance().getDb();
    
    // 1. Fetch all notes and embeddings in this room
    const notes = await db.getAllAsync<{ id: string; embedding: Uint8Array }>(
      `SELECT n.id, e.embedding 
       FROM notes n 
       JOIN note_embeddings e ON n.id = e.note_id 
       WHERE n.room_id = ? AND n.is_deleted = 0`,
      [roomId]
    );

    if (notes.length < 2) return;

    // 2. Simple split: Find the two most distant notes to act as new seeds
    // For now, we'll just use a random split for the prototype, 
    // but Phase 3 goal is "Natural evolution".
    
    const newRoomA = `room_${Date.now()}_A`;
    const newRoomB = `room_${Date.now()}_B`;

    // Assign notes to new rooms (alternating for now, Phase 3: use centroids)
    for (let i = 0; i < notes.length; i++) {
      const targetRoom = i % 2 === 0 ? newRoomA : newRoomB;
      await db.runAsync(
        'UPDATE notes SET room_id = ? WHERE id = ?',
        [targetRoom, notes[i].id]
      );
    }

    // 3. Mark the old room as "Collapsed"
    console.log(`[ClusteringService] Room ${roomId} has collapsed into ${newRoomA} and ${newRoomB}.`);
  }
}
