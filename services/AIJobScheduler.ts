import { DatabaseService } from './DatabaseService';
import { AIResourceManager } from './AIResourceManager';
import { EmbeddingEngine } from './EmbeddingEngine';
import { LocalLlamaService } from './LocalLlamaService';
import { NoteService } from './NoteService';
import { Note } from '../store/useNotesStore';
import { Logger } from './Logger';
import { extractDeep } from './ai';


/**
 * AI JOB SCHEDULER (Mammoth Scale - Debug Mode)
 * The engine room of the background intelligence pipeline.
 * Processes SQLite-persisted jobs using a battery-efficient batch strategy.
 */
export class AIJobScheduler {
  private static instance: AIJobScheduler;
  private isProcessing: boolean = false;
  private timer: any = null;

  private constructor() {}

  public static getInstance(): AIJobScheduler {
    if (!AIJobScheduler.instance) {
      AIJobScheduler.instance = new AIJobScheduler();
    }
    return AIJobScheduler.instance;
  }

  public start() {
    if (this.timer) return;
    Logger.log('Background scheduler ignited (8s pulse).');
    
    // Increased frequency for debugging/active sessions
    this.timer = setInterval(() => this.processNextBatch(), 8000);
    
    // Initial burst
    setTimeout(() => this.processNextBatch(), 2000);
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    console.log('[AIJobScheduler] Background scheduler hibernated.');
  }

  private async processNextBatch() {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;

    try {
      const db = await DatabaseService.getInstance().getDb();
      
      // 1. Fetch pending jobs
      const jobs = await db.getAllAsync<{ id: string, note_id: string, type: string }>(
        "SELECT id, note_id, type FROM ai_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5"
      );

      if (jobs.length === 0) {
        // Go idle if no jobs
        const currentMode = AIResourceManager.getInstance().getCurrentMode();
        if (currentMode !== 'idle') {
          Logger.log('No jobs pending. Releasing AI resources.');
          await AIResourceManager.getInstance().requestMode('idle');
        }
        this.isProcessing = false;
        return;
      }

      Logger.log(`Pipeline active: ${jobs.length} tasks in queue.`);

      // 2. Group by type to minimize mode switching (expensive)
      const embeddingJobs = jobs.filter(j => j.type === 'embedding');
      const classificationJobs = jobs.filter(j => j.type === 'classification' || j.type === 'synthesis');

      // 3. Process Embeddings
      if (embeddingJobs.length > 0) {
        console.log(`[AIJobScheduler] Switching to EMBEDDING mode for ${embeddingJobs.length} jobs.`);
        await AIResourceManager.getInstance().requestMode('embedding');
        for (const job of embeddingJobs) {
          await this.executeEmbeddingJob(job.id, job.note_id);
          await new Promise(r => setTimeout(r, 100)); // Cool down
        }
      }

      // 4. Process Deep Intelligence (Llama)
      if (classificationJobs.length > 0) {
        console.log(`[AIJobScheduler] Switching to SYNTHESIS mode for ${classificationJobs.length} jobs.`);
        await AIResourceManager.getInstance().requestMode('synthesis');
        for (const job of classificationJobs) {
          await this.executeSynthesisJob(job.id, job.note_id);
          await new Promise(r => setTimeout(r, 200)); // Cool down
        }
      }

      console.log('[AIJobScheduler] 🏁 Batch complete.');

    } catch (e) {
      console.error('[AIJobScheduler] ❌ Batch processing critical failure:', e);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeEmbeddingJob(jobId: string, noteId: string) {
    const db = await DatabaseService.getInstance().getDb();
    const startTime = Date.now();
    try {
      console.log(`[AIJobScheduler] Start Embedding: ${noteId}`);
      await db.runAsync("UPDATE ai_jobs SET status = 'processing', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      
      const note = await db.getFirstAsync<{ content: string }>("SELECT content FROM notes WHERE id = ?", [noteId]);
      if (!note) throw new Error('Note missing from database');

      const vector = await EmbeddingEngine.getInstance().embed(note.content);
      
      // Save vector (Convert Float32Array to Uint8Array for SQLite BLOB)
      await db.runAsync(
        "INSERT OR REPLACE INTO note_embeddings (note_id, embedding, model_version, updated_at) VALUES (?, ?, 'nomic-v1', ?)",
        [noteId, new Uint8Array(vector.buffer), Date.now()]
      );

      const duration = Date.now() - startTime;
      
      // Update note status
      await NoteService.getInstance().updateNote(noteId, { 
        embedding_status: 'complete',
        pipeline_step: 'vectorizing' // Move to next step if applicable
      });
      
      await db.runAsync("UPDATE ai_jobs SET status = 'completed', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      console.log(`[AIJobScheduler] ✅ Embedding ${noteId} success (${duration}ms)`);
      
    } catch (e: any) {
      console.warn(`[AIJobScheduler] ⚠️ Embedding failed for ${noteId}:`, e.message);
      await db.runAsync("UPDATE ai_jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?", [e.message, Date.now(), jobId]);
    }
  }

  private async executeSynthesisJob(jobId: string, noteId: string) {
    const db = await DatabaseService.getInstance().getDb();
    const startTime = Date.now();
    try {
      console.log(`[AIJobScheduler] Start Synthesis: ${noteId}`);
      await db.runAsync("UPDATE ai_jobs SET status = 'processing', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      
      const note = await db.getFirstAsync<{ content: string, category: string, pipeline_metrics: string }>("SELECT content, category, pipeline_metrics FROM notes WHERE id = ?", [noteId]);
      if (!note) throw new Error('Note missing from database');

      // Fetch note embedding if it exists to perform deep semantic classification
      const embeddingRow = await db.getFirstAsync<{ embedding: Uint8Array }>(
        "SELECT embedding FROM note_embeddings WHERE note_id = ?",
        [noteId]
      );
      
      let embedding: Float32Array | undefined;
      if (embeddingRow?.embedding) {
        // Safe conversion of SQLite BLOB to Float32Array
        const buffer = embeddingRow.embedding.buffer;
        embedding = new Float32Array(buffer, embeddingRow.embedding.byteOffset, embeddingRow.embedding.byteLength / 4);
      }

      // Run deep semantic tags & resonance classification
      const semanticMeta = await extractDeep(note.content, embedding);

      // Synthesis from Local Llama if available
      let llamaResult;
      try {
        llamaResult = await LocalLlamaService.getInstance().synthesise(note.content);
      } catch (llamaErr) {
        console.warn('[AIJobScheduler] Local Llama synthesis failed/offline, using provisional heuristic synthesis');
      }

      const duration = Date.now() - startTime;
      
      // Update note with rich metadata
      const metrics = note.pipeline_metrics ? JSON.parse(note.pipeline_metrics) : {};
      metrics.synthesis_ms = duration;
      metrics.total_ms = (metrics.total_ms || 0) + duration;

      const finalCategory = semanticMeta.primaryCategory || note.category || 'Journal';
      
      const mergedMetadata = {
        ...semanticMeta,
        category: finalCategory,
        summary: llamaResult?.summary || 'A thought in the drift.',
        sentiment: (llamaResult?.emotion ? 'neutral' : 'neutral') as any, // Simple mapping
        emotion: llamaResult?.emotion || semanticMeta.emotion,
      };

      await NoteService.getInstance().updateNote(noteId, { 
        category: finalCategory,
        emotion: mergedMetadata.emotion,
        summary: mergedMetadata.summary,
        synthesis_status: 'complete',
        pipeline_step: 'complete',
        pipeline_metrics: metrics,
        entities_json: JSON.stringify(mergedMetadata)
      });

      await db.runAsync("UPDATE ai_jobs SET status = 'completed', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      Logger.log(`Synthesis ${noteId} success (${duration}ms)`);
      
    } catch (e: any) {
      Logger.error(`Synthesis failed for ${noteId}`, e, { noteId, jobId });
      await db.runAsync("UPDATE ai_jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?", [e.message, Date.now(), jobId]);
      
      // Update note with error status so the UI knows
      await NoteService.getInstance().updateNote(noteId, { 
        synthesis_status: 'error',
        pipeline_step: 'error',
        pipeline_metrics: { error_message: e.message }
      });
    }
  }
}
