import { NoteService } from './NoteService';
import { useNotesStore, Note } from '../store/useNotesStore';
import * as Crypto from 'expo-crypto';

const getLlama = () => require('./LocalLlamaService').LocalLlamaService.getInstance();

export class SynthesisService {
  private static instance: SynthesisService;

  private constructor() {}

  public static getInstance(): SynthesisService {
    if (!SynthesisService.instance) {
      SynthesisService.instance = new SynthesisService();
    }
    return SynthesisService.instance;
  }

  /**
   * Evolves a thought in-place.
   */
  public async evolveThought(sourceNote: Note) {
    console.log(`[SynthesisService] Evolving note in-place: ${sourceNote.id}`);
    const updateNote = useNotesStore.getState().updateNote;

    try {
      // 1. Mark as refining for UI pulsation
      updateNote(sourceNote.id, { is_refining: true });

      // 2. Generate the poetic synthesis via Llama
      const result = await getLlama().synthesise(sourceNote.content);
      
      if (!result.summary || result.summary.length < 5) {
        updateNote(sourceNote.id, { is_refining: false });
        return null;
      }

      // 3. Update the ORIGINAL node with the evolved content
      const updatedNote = {
        content: result.summary,
        is_refining: false,
        entities_json: JSON.stringify({
          ...JSON.parse(sourceNote.entities_json || '{}'),
          is_evolved: true,
          original_content: sourceNote.content,
          topic: result.topic
        })
      };

      await NoteService.getInstance().updateNote(sourceNote.id, updatedNote);
      updateNote(sourceNote.id, updatedNote);

      console.log(`[SynthesisService] Evolution complete for: ${sourceNote.id}`);
      return sourceNote;
    } catch (error) {
      console.error('[SynthesisService] Evolution failed:', error);
      updateNote(sourceNote.id, { is_refining: false });
      return null;
    }
  }
}
