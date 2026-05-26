import { DatabaseService } from './DatabaseService';
import { EmbeddingEngine } from './EmbeddingEngine';
import { VectorSearchService } from './VectorSearchService';
import { useNotesStore, Note } from '../store/useNotesStore';
import { ResourceCoordinator } from './ResourceCoordinator';
import { SynthesisService } from './SynthesisService';

export class EmbeddingManager {
  private static instance: EmbeddingManager;
  private engine: EmbeddingEngine;
  private taskQueue: { noteId: string; content: string }[] = [];
  private isTaskRunning: boolean = false;

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
   * Sequential Queue Entry Point
   */
  public async processNote(noteId: string, content: string): Promise<void> {
    console.log(`[EmbeddingManager] Queuing note: ${noteId}`);
    this.taskQueue.push({ noteId, content });
    
    // Set to queued status immediately for UI feedback
    useNotesStore.getState().updateNote(noteId, { pipeline_step: 'queued' });
    
    this.runQueue();
  }

  private async runQueue() {
    if (this.isTaskRunning || this.taskQueue.length === 0) return;

    this.isTaskRunning = true;
    const { noteId, content } = this.taskQueue.shift()!;

    try {
      console.log(`[EmbeddingManager] Starting sequential task for: ${noteId}`);
      
      // Reset metrics and set status
      useNotesStore.getState().updateNote(noteId, { 
        pipeline_step: 'embedding',
        pipeline_metrics: { start_time: Date.now() }
      });

      const pipelineTask = async () => {
        const note = useNotesStore.getState().notes.find(n => n.id === noteId);
        const isPage = note?.note_type === 'page' || content.length > 500; // Auto-promote to Page if > 500 chars

        console.log(`[NeuralTrace] Requesting Brain: embedding for ${noteId}`);
        await ResourceCoordinator.getInstance().requestBrain('embedding');

        const db = await DatabaseService.getInstance().getDb();
        let embedding: Float32Array;

        if (isPage) {
          console.log(`[EmbeddingManager] Processing Drift Page (chunking) for: ${noteId}`);
          
          // Split into paragraph-based chunks
          const paragraphs = content.split('\n\n');
          const chunks: { index: number; text: string; start: number; end: number }[] = [];
          let charOffset = 0;

          paragraphs.forEach((pStr, idx) => {
            const pClean = pStr.trim();
            if (!pClean) return;
            const start = content.indexOf(pClean, charOffset);
            const end = start + pClean.length;
            charOffset = end;
            chunks.push({ index: idx, text: pClean, start, end });
          });

          const chunkCount = chunks.length;
          const wordCount = content.split(/\s+/).filter(Boolean).length;
          const readingTime = Math.max(1, Math.ceil(wordCount / 200)) * 60; // seconds

          const chunkEmbeddings: Float32Array[] = [];
          for (const chunk of chunks) {
            console.log(`[EmbeddingManager] Vectorizing chunk ${chunk.index + 1}/${chunkCount}`);
            const chunkEmbedding = await this.engine.embed(chunk.text, false);
            chunkEmbeddings.push(chunkEmbedding);

            const chunkBlob = new Uint8Array(chunkEmbedding.buffer);
            const chunkId = `${noteId}_chunk_${chunk.index}`;

            await db.runAsync(
              'INSERT OR REPLACE INTO note_chunks (id, parent_note_id, chunk_index, text, embedding, char_start, char_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [chunkId, noteId, chunk.index, chunk.text, chunkBlob, chunk.start, chunk.end, Date.now()]
            );
          }

          // Compute average vector representing the whole Page
          if (chunkEmbeddings.length > 0) {
            const dim = chunkEmbeddings[0].length;
            const avg = new Float32Array(dim);
            for (let d = 0; d < dim; d++) {
              let sum = 0;
              for (let i = 0; i < chunkEmbeddings.length; i++) {
                sum += chunkEmbeddings[i][d];
              }
              avg[d] = sum / chunkEmbeddings.length;
            }
            
            // Normalize the average vector
            let sumSq = 0;
            for (let i = 0; i < avg.length; i++) {
              sumSq += avg[i] * avg[i];
            }
            const norm = Math.sqrt(sumSq);
            for (let i = 0; i < avg.length; i++) {
              avg[i] /= Math.max(norm, 1e-12);
            }
            
            embedding = avg;
          } else {
            embedding = await this.engine.embed(content, false);
          }

          // Update main note structure in database and state
          await db.runAsync(
            'UPDATE notes SET note_type = ?, word_count = ?, reading_time = ?, chunk_count = ? WHERE id = ?',
            ['page', wordCount, readingTime, chunkCount, noteId]
          );

          useNotesStore.getState().updateNote(noteId, {
            note_type: 'page',
            word_count: wordCount,
            reading_time: readingTime,
            chunk_count: chunkCount
          });

        } else {
          // Standard ambient note embedding
          console.log(`[NeuralTrace] Generating Embedding: ${noteId}`);
          const embeddingPromise = this.engine.embed(content, false);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Embedding Engine Timeout')), 15000)
          );
          
          embedding = await Promise.race([embeddingPromise, timeoutPromise]) as Float32Array;
        }

        // Release resources and save to DB
        ResourceCoordinator.getInstance().releaseBrain();
        console.log(`[NeuralTrace] Embedding generated successfully: ${noteId}`);
        
        console.log(`[NeuralTrace] Persisting to DB: ${noteId}`);
        const blob = new Uint8Array(embedding.buffer);
        
        const dbPromise = db.runAsync(
          'INSERT OR REPLACE INTO note_embeddings (note_id, embedding, model_version, updated_at) VALUES (?, ?, ?, ?)',
          [noteId, blob, 'multilingual-e5-small-v1', Date.now()]
        );
        const dbTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database Lock Timeout')), 5000)
        );
        await Promise.race([dbPromise, dbTimeout]);

        // PHASE 3: Re-index in HNSW
        console.log(`[EmbeddingManager] Vectorizing: ${noteId}`);
        useNotesStore.getState().updateNote(noteId, { pipeline_step: 'vectorizing' });
        const vectorStart = Date.now();
        await VectorSearchService.getInstance().addNote(noteId, embedding);
        
        useNotesStore.getState().updateNote(noteId, { 
          pipeline_step: 'synthesizing',
          pipeline_metrics: {
            ...useNotesStore.getState().notes.find(n => n.id === noteId)?.pipeline_metrics,
            embedding_ms: 0,
            vectorizing_ms: Date.now() - vectorStart
          }
        });

        // Calculate semantic edges
        await this.calculateEdges(noteId, embedding);

        // PHASE 4: Trigger Synthesis
        const finalNote = useNotesStore.getState().notes.find((n: Note) => n.id === noteId);
        if (finalNote) {
          console.log(`[EmbeddingManager] Synthesis handoff: ${noteId}`);
          SynthesisService.getInstance().evolveThought(finalNote);
        } else {
          console.warn(`[EmbeddingManager] Note ${noteId} not found in store for handoff.`);
        }
      };

      const globalTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Global Pipeline Timeout')), 45000)
      );

      await Promise.race([pipelineTask(), globalTimeout]);

    } catch (error: any) {
      console.error(`[EmbeddingManager] Pipeline failed for ${noteId}:`, error);
      useNotesStore.getState().updateNote(noteId, { 
        pipeline_step: 'error',
        pipeline_metrics: {
          ...useNotesStore.getState().notes.find(n => n.id === noteId)?.pipeline_metrics,
          error_message: error?.message || 'Unknown Pipeline Error'
        }
      });
    } finally {
      this.isTaskRunning = false;
      this.runQueue();
    }
  }

  private async calculateEdges(noteId: string, embedding: Float32Array) {
    try {
      const db = await DatabaseService.getInstance().getDb();
      const allOtherEmbeddings = await db.getAllAsync<{ note_id: string; embedding: Uint8Array }>(
        'SELECT note_id, embedding FROM note_embeddings WHERE note_id != ?',
        [noteId]
      );

      if (allOtherEmbeddings.length === 0) return;

      const similarities = allOtherEmbeddings.map(other => {
        const otherVector = new Float32Array(other.embedding.buffer);
        let dotProduct = 0;
        for (let i = 0; i < embedding.length; i++) {
          dotProduct += embedding[i] * otherVector[i];
        }
        return { id: other.note_id, score: dotProduct };
      });

      similarities.sort((a, b) => b.score - a.score);
      const topEdges = similarities.slice(0, 5);

      await db.runAsync('DELETE FROM semantic_edges WHERE source_id = ?', [noteId]);
      for (const edge of topEdges) {
        if (edge.score > 0.65) {
          await db.runAsync(
            'INSERT INTO semantic_edges (source_id, target_id, strength) VALUES (?, ?, ?)',
            [noteId, edge.id, edge.score]
          );
        }
      }
    } catch (e) {
      console.error('[EmbeddingManager] Edge calculation failed:', e);
    }
  }

  /**
   * Scans for notes without embeddings and queues them.
   */
  public async backfillEmbeddings() {
    console.log('[EmbeddingManager] Starting semantic backfill...');
    try {
      const db = await DatabaseService.getInstance().getDb();
      const notesWithoutEmbeddings = await db.getAllAsync<{ id: string; content: string }>(
        'SELECT id, content FROM notes WHERE id NOT IN (SELECT note_id FROM note_embeddings)'
      );

      console.log(`[EmbeddingManager] Found ${notesWithoutEmbeddings.length} notes to backfill.`);
      for (const note of notesWithoutEmbeddings) {
        await this.processNote(note.id, note.content);
      }
    } catch (e) {
      console.error('[EmbeddingManager] Backfill failed:', e);
    }
  }
}
