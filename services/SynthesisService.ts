import { NoteService } from './NoteService';
import { Note } from '../store/useNotesStore';
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
   * Generates a permanent "Idea Note" from a raw thought.
   * This is the core of Recursive Evolution.
   */
  public async evolveThought(sourceNote: Note) {
    console.log(`[SynthesisService] Evolving note: ${sourceNote.id}`);

    try {
      // 1. Generate the poetic synthesis via Llama
      const result = await getLlama().synthesise(sourceNote.content);
      
      if (!result.summary || result.summary.length < 5) return null;

      // 2. Create the "Higher-Order Idea Node"
      const ideaNote: Note = {
        id: Crypto.randomUUID(),
        content: result.summary,
        created_at: Date.now(),
        source_type: 'synthesis',
        entities_json: JSON.stringify({
          type: 'high_order_insight',
          children: result.connections, // The IDs of the original notes that formed this insight
          topic: result.topic
        })
      };

      // 3. Persist the new node into the galaxy
      console.log(`[SynthesisService] Saving new Idea Node: ${ideaNote.id}`);
      await NoteService.getInstance().saveNote(ideaNote);

      return ideaNote;
    } catch (error) {
      console.error('[SynthesisService] Evolution failed:', error);
      return null;
    }
  }
}
