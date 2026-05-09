import { LLMModule } from 'react-native-executorch';
import { documentDirectory, getInfoAsync } from 'expo-file-system';

import { RetrievalService } from './RetrievalService';
import { Note } from '../store/useNotesStore';

export type SynthesisResult = {
  summary: string;
  connections: string[]; // Note IDs that were linked
  topic: string;
};

export class LocalLlamaService {
  private static instance: LocalLlamaService;
  private model: LLMModule | null = null;
  
  // Model file structure for ExecuTorch
  private paths = {
    model: `${documentDirectory}models/llama-3.2-1b.pte`,
    tokenizer: `${documentDirectory}models/tokenizer.json`,
    config: `${documentDirectory}models/tokenizer_config.json`
  };

  private isLoaded = false;

  private constructor() {}

  public static getInstance(): LocalLlamaService {
    if (!LocalLlamaService.instance) {
      LocalLlamaService.instance = new LocalLlamaService();
    }
    return LocalLlamaService.instance;
  }

  /**
   * Initializes the ExecuTorch runtime and loads Llama 3.2.
   * This is a heavy operation (~800MB RAM).
   */
  public async init() {
    if (this.isLoaded) return;

    try {
      const modelInfo = await getInfoAsync(this.paths.model);
      if (!modelInfo.exists) {
        console.warn('[LocalLlamaService] Model file not found at:', this.paths.model);
        return;
      }

      console.log('[LocalLlamaService] Igniting Llama 3.2 1B Core...');
      
      this.model = await LLMModule.fromCustomModel(
        this.paths.model,
        this.paths.tokenizer,
        this.paths.config,
        (progress) => {
          console.log(`[LocalLlamaService] Loading: ${Math.round(progress * 100)}%`);
        }
      );

      // Configure for poetic, concise synthesis
      // Note: 'max_new_tokens' is not in the type definition, removed to satisfy compiler
      this.model.configure({
        generationConfig: {
          temperature: 0.7,
          topP: 0.9
        }
      });

      this.isLoaded = true;
      console.log('[LocalLlamaService] Llama Core Ready.');
    } catch (error) {
      console.error('[LocalLlamaService] Ignition failed:', error);
    }
  }

  /**
   * Generates a "Semantic Bridge" between disparate thoughts.
   */
  public async synthesise(query: string): Promise<SynthesisResult> {
    if (!this.isLoaded || !this.model) {
      return { 
        summary: "The synthesis engine is offline. Download the model to evolve your thoughts.", 
        connections: [],
        topic: "Offline"
      };
    }

    try {
      // 1. Retrieve the most similar thoughts to the current query/note
      const contextNotes = await RetrievalService.getInstance().executeExplore(query, 5) as Note[];
      const thoughtStream = contextNotes.map((n: Note) => `- ${n.content}`).join('\n');

      const prompt = `
        <|begin_of_text|><|start_header_id|>system<|end_header_id|>
        You are the Drift Palace Synthesis Engine. Your job is to find a hidden pattern between the following user thoughts and the new query.
        Keep it to 2-3 sentences. Be insightful and slightly abstract. Do not use prefixes like "The connection is".
        <|eot_id|><|start_header_id|>user<|end_header_id|>
        THOUGHTS:
        ${thoughtStream}

        QUERY: ${query}

        SYNTHESISE:<|eot_id|><|start_header_id|>assistant<|end_header_id|>
      `;

      console.log('[LocalLlamaService] Weaving semantic bridge...');
      const summary = await this.model.forward(prompt);

      return {
        summary: summary.trim(),
        connections: contextNotes.map((n: Note) => n.id),
        topic: "Discovery"
      };
    } catch (error) {
      console.error('[LocalLlamaService] Synthesis failed:', error);
      return { 
        summary: "A neural static occurred. Your thoughts are still individual stars, waiting for a bridge.", 
        connections: [],
        topic: "Static"
      };
    }
  }

  /**
   * Releases native memory. Essential before opening complex 3D Nexus maps.
   */
  public async unload() {
    if (this.model) {
      this.model.delete();
      this.model = null;
      this.isLoaded = false;
      console.log('[LocalLlamaService] Llama Core hibernating.');
    }
  }
}
