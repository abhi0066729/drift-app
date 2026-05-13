import { DatabaseService } from './DatabaseService';
import { AIResourceManager } from './AIResourceManager';
import { EmbeddingEngine } from './EmbeddingEngine';
import { LocalLlamaService } from './LocalLlamaService';
import { NoteService } from './NoteService';
import { Note } from '../store/useNotesStore';

/**
 * AI JOB SCHEDULER (Mammoth Scale)
 * The engine room of the background intelligence pipeline.
 * Processes SQLite-persisted jobs using a battery-efficient batch strategy.
 */
export class AIJobScheduler {
  private static instance: AIJobScheduler;
  private isProcessing: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): AIJobScheduler {
    if (!AIJobScheduler.instance) {
      AIJobScheduler.instance = new AIJobScheduler();
    }
    return AIJobScheduler.instance;
  }

  public start() {
    if (this.timer) return;
    console.log('[AIJobScheduler] Background scheduler ignited.');
    // Check for jobs every 30 seconds to be battery-conscious
    this.timer = setInterval(() => this.processNextBatch(), 30000);
    // Initial burst
    setTimeout(() => this.processNextBatch(), 5000);
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async processNextBatch() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const db = await DatabaseService.getInstance().getDb();
      
      // 1. Fetch pending jobs
      const jobs = await db.getAllAsync<{ id: string, note_id: string, type: string }>(
        "SELECT id, note_id, type FROM ai_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 10"
      );

      if (jobs.length === 0) {
        // Go idle if no jobs
        await AIResourceManager.getInstance().requestMode('idle');
        this.isProcessing = false;
        return;
      }

      console.log(`[AIJobScheduler] Processing ${jobs.length} pending tasks...`);

      // 2. Group by type to minimize mode switching
      const embeddingJobs = jobs.filter(j => j.type === 'embedding');
      const classificationJobs = jobs.filter(j => j.type === 'classification' || j.type === 'synthesis');

      // 3. Process Embeddings
      if (embeddingJobs.length > 0) {
        await AIResourceManager.getInstance().requestMode('embedding');
        for (const job of embeddingJobs) {
          await this.executeEmbeddingJob(job.id, job.note_id);
          // Yield between jobs
          await new Promise(r => setTimeout(r, 50));
        }
      }

      // 4. Process Deep Intelligence (Llama)
      if (classificationJobs.length > 0) {
        await AIResourceManager.getInstance().requestMode('synthesis');
        for (const job of classificationJobs) {
          await this.executeSynthesisJob(job.id, job.note_id);
          // Yield between jobs
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // 5. Cleanup
      await AIResourceManager.getInstance().requestMode('idle');

    } catch (e) {
      console.error('[AIJobScheduler] Batch processing failed:', e);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeEmbeddingJob(jobId: string, noteId: string) {
    const db = await DatabaseService.getInstance().getDb();
    try {
      await db.runAsync("UPDATE ai_jobs SET status = 'processing', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      
      const note = await db.getFirstAsync<{ content: string }>("SELECT content FROM notes WHERE id = ?", [noteId]);
      if (!note) throw new Error('Note not found');

      const vector = await EmbeddingEngine.getInstance().embed(note.content);
      
      // Save vector
      await db.runAsync(
        "INSERT OR REPLACE INTO note_embeddings (note_id, embedding, model_version, updated_at) VALUES (?, ?, 'nomic-v1', ?)",
        [noteId, vector, Date.now()]
      );

      // Update note status
      await NoteService.getInstance().updateNote(noteId, { embedding_status: 'complete' });
      await db.runAsync("UPDATE ai_jobs SET status = 'completed', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      
      console.log(`[AIJobScheduler] Embedding job ${jobId} finished.`);
    } catch (e: any) {
      console.warn(`[AIJobScheduler] Embedding job ${jobId} failed:`, e.message);
      await db.runAsync("UPDATE ai_jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?", [e.message, Date.now(), jobId]);
    }
  }

  private async executeSynthesisJob(jobId: string, noteId: string) {
    const db = await DatabaseService.getInstance().getDb();
    try {
      await db.runAsync("UPDATE ai_jobs SET status = 'processing', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      
      const note = await db.getFirstAsync<{ content: string }>("SELECT content FROM notes WHERE id = ?", [noteId]);
      if (!note) throw new Error('Note not found');

      const result = await LocalLlamaService.getInstance().synthesise(note.content);
      
      // Update note with rich metadata
      await NoteService.getInstance().updateNote(noteId, { 
        category: result.category,
        emotion: result.emotion,
        summary: result.summary,
        synthesis_status: 'complete'
      });

      await db.runAsync("UPDATE ai_jobs SET status = 'completed', updated_at = ? WHERE id = ?", [Date.now(), jobId]);
      console.log(`[AIJobScheduler] Synthesis job ${jobId} finished.`);
    } catch (e: any) {
      console.warn(`[AIJobScheduler] Synthesis job ${jobId} failed:`, e.message);
      await db.runAsync("UPDATE ai_jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?", [e.message, Date.now(), jobId]);
    }
  }
}
