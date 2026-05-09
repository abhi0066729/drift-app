import * as FileSystem from 'expo-file-system';
import { RetrievalService } from './RetrievalService';
import { Note } from '../store/useNotesStore';
import { Platform } from 'react-native';

export type SynthesisResult = {
  summary: string;
  connections: string[];
  topic: string;
};

export class LocalLlamaService {
  private static instance: LocalLlamaService;
  private model: any = null;
  
  private paths = {
    model: `${(FileSystem as any).documentDirectory}models/llama-3.2-1b.pte`,
    tokenizer: `${(FileSystem as any).documentDirectory}models/tokenizer.json`,
    config: `${(FileSystem as any).documentDirectory}models/tokenizer_config.json`
  };

  private isLoaded = false;
  private constructor() {}

  public static getInstance(): LocalLlamaService {
    if (!LocalLlamaService.instance) {
      LocalLlamaService.instance = new LocalLlamaService();
    }
    return LocalLlamaService.instance;
  }

  public async init() {
    if (this.isLoaded || Platform.OS === 'web') return;

    try {
      // Dynamic import to prevent export-time crashes
      const { LLMModule } = require('react-native-executorch');
      
      const modelInfo = await FileSystem.getInfoAsync(this.paths.model);

      if (!modelInfo.exists) return;

      this.model = await LLMModule.fromCustomModel(
        this.paths.model,
        this.paths.tokenizer,
        this.paths.config,
        (progress: number) => {
          console.log(`[LocalLlamaService] Loading: ${Math.round(progress * 100)}%`);
        }
      );

      this.model.configure({
        generationConfig: { temperature: 0.7, topP: 0.9 }
      });

      this.isLoaded = true;
    } catch (error) {
      console.error('[LocalLlamaService] Ignition failed:', error);
    }
  }

  public async synthesise(query: string): Promise<SynthesisResult> {
    if (!this.isLoaded || !this.model) {
      return { summary: "Synthesis offline.", connections: [], topic: "Offline" };
    }

    try {
      const contextNotes = await RetrievalService.getInstance().executeExplore(query, 5) as Note[];
      const thoughtStream = contextNotes.map((n: Note) => `- ${n.content}`).join('\n');

      const prompt = `
        <|begin_of_text|><|start_header_id|>system<|end_header_id|>
        Find a pattern between these thoughts:
        ${thoughtStream}
        QUERY: ${query}
        SYNTHESISE:<|eot_id|><|start_header_id|>assistant<|end_header_id|>
      `;

      const summary = await this.model.forward(prompt);
      return {
        summary: summary.trim(),
        connections: contextNotes.map((n: Note) => n.id),
        topic: "Discovery"
      };
    } catch (error) {
      return { summary: "Neural static.", connections: [], topic: "Static" };
    }
  }

  public async unload() {
    if (this.model) {
      this.model.delete();
      this.model = null;
      this.isLoaded = false;
    }
  }
}
