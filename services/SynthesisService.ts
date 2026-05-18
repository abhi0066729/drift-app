import { useNotesStore, Note } from '../store/useNotesStore';
import { getLlama } from './ai';
import { ResourceCoordinator } from './ResourceCoordinator';

/**
 * SynthesisService.ts
 * 
 * THE EVOLUTION ENGINE:
 * - Orchestrates the transition from a raw Journal note to a Synthesized Thought.
 * - Handles category refinement, summary weaving, and resonance hydration.
 */
export class SynthesisService {
  private static instance: SynthesisService;

  private constructor() {}

  public static getInstance(): SynthesisService {
    if (!SynthesisService.instance) {
      SynthesisService.instance = new SynthesisService();
    }
    return SynthesisService.instance;
  }

  public async evolveThought(sourceNote: Note) {
    const { updateNote } = useNotesStore.getState();
    
    try {
      // 1. Initial State: Signal that refinement has begun
      updateNote(sourceNote.id, { is_refining: true, pipeline_step: 'synthesizing' });

      // 2. Deep Synthesis via Llama
      console.log(`[SynthesisService] Starting AI synthesis for: ${sourceNote.id}`);
      const synthesisStart = Date.now();
      
      await ResourceCoordinator.getInstance().requestBrain('synthesis');

      const llamaPromise = getLlama().synthesise(sourceNote.content);
      const llamaTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Llama Synthesis Timeout')), 30000)
      );

      const result = await Promise.race([llamaPromise, llamaTimeout]);
      ResourceCoordinator.getInstance().releaseBrain();
      
      const synthesisEnd = Date.now();
      const synthesisMs = synthesisEnd - synthesisStart;
      console.log(`[SynthesisService] AI synthesis complete in ${synthesisMs}ms for: ${sourceNote.id}`);
      
      if (!result.summary || result.summary.length < 5 || result.summary.includes("offline") || result.summary.includes("Neural static")) {
        console.warn('[SynthesisService] Synthesis failed or offline, preserving original note.');
        updateNote(sourceNote.id, { is_refining: false, pipeline_step: 'complete' });
        return { summary: "Synthesis offline.", topic: "Offline" };
      }

      // 3. Final Categorization & Resonance Hydration
      let finalCategory = result.category || sourceNote.category || 'Journal';
      if (sourceNote.category && sourceNote.category !== 'Journal' && finalCategory === 'Journal') {
        finalCategory = sourceNote.category;
      }
      
      const entities = {
        summary: result.summary,
        category: finalCategory,
        emotion: result.emotion,
        resonances: result.resonances,
        children: result.connections,
        synthesized_at: Date.now(),
        is_evolved: true,
        original_content: sourceNote.content,
        cognitive_mode: result.cognitive_mode || 'REFLECTION',
        domain_tags: result.domain_tags || [],
        topics: result.domain_tags || []
      };

      const finalChanges = {
        category: finalCategory,
        entities_json: JSON.stringify(entities),
        is_refining: false,
        pipeline_step: 'complete' as const,
        pipeline_metrics: JSON.stringify({
          ...sourceNote.pipeline_metrics,
          synthesis_ms: synthesisMs,
          total_ms: Date.now() - (sourceNote.pipeline_metrics?.start_time || Date.now())
        })
      };

      const { DatabaseService } = require('./DatabaseService');
      const db = await DatabaseService.getInstance().getDb();
      await db.runAsync(
        'UPDATE notes SET category = ?, entities_json = ?, is_refining = ?, pipeline_step = ?, pipeline_metrics = ? WHERE id = ?',
        [finalChanges.category, finalChanges.entities_json, 0, 'complete', finalChanges.pipeline_metrics, sourceNote.id]
      );

      updateNote(sourceNote.id, {
        ...finalChanges,
        pipeline_metrics: JSON.parse(finalChanges.pipeline_metrics)
      });

      console.log(`[SynthesisService] Evolution complete for: ${sourceNote.id}`);
      return { summary: result.summary, topic: finalCategory };
    } catch (error) {
      console.error('[SynthesisService] Evolution failed or timed out:', error);
      
      // FALLBACK: Use Shadow Engine (Keywords) instead of failing
      const { predictIntent } = require('./ai');
      let fallbackCategory = sourceNote.category || 'Journal';
      let fallbackEmotion = 'neutral';
      let fallbackResonances: Record<string, number> = { [fallbackCategory]: 1.0 };

      try {
        const fallbackEntities = await predictIntent(sourceNote.content);
        if (fallbackEntities) {
          fallbackCategory = fallbackEntities.category || fallbackCategory;
          fallbackEmotion = fallbackEntities.emotion || fallbackEmotion;
          fallbackResonances = fallbackEntities.resonances || fallbackResonances;
        }
      } catch (predictErr) {
        console.error('[SynthesisService] predictIntent fallback failed:', predictErr);
      }

      if (sourceNote.category && sourceNote.category !== 'Journal' && fallbackCategory === 'Journal') {
        fallbackCategory = sourceNote.category;
      }
      
      const recoveryChanges = {
        category: fallbackCategory,
        entities_json: JSON.stringify({
          summary: "Synthesis bypassed (Resource limit).",
          category: fallbackCategory,
          emotion: fallbackEmotion,
          resonances: fallbackResonances,
          is_evolved: false
        }),
        is_refining: false,
        pipeline_step: 'complete' as const
      };

      const { DatabaseService } = require('./DatabaseService');
      const db = await DatabaseService.getInstance().getDb();
      await db.runAsync(
        'UPDATE notes SET category = ?, entities_json = ?, is_refining = ?, pipeline_step = ? WHERE id = ?',
        [recoveryChanges.category, recoveryChanges.entities_json, 0, 'complete', sourceNote.id]
      );
      updateNote(sourceNote.id, recoveryChanges);
      
      return { summary: "Synthesis bypassed.", topic: recoveryChanges.category };
    }
  }
}
