// @ts-ignore - TS defs are stale but this works at runtime
import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Note } from '../store/useNotesStore';
import { RetrievalService } from './RetrievalService';

export type SynthesisResult = {
  summary: string;
  connections: string[];
  category: string;
  emotion: string;
  resonances: Record<string, number>;
};

export class LocalLlamaService {
  private static instance: LocalLlamaService;
  private model: any = null;

  private paths = {
    model: `${documentDirectory}models/Llama-3.2-1B-Instruct-Q4_K_M.gguf`,
    tokenizer: `${documentDirectory}models/tokenizer.json`,
    config: `${documentDirectory}models/tokenizer_config.json`
  };

  private isLoaded = false;
  private constructor() { }

  public static getInstance(): LocalLlamaService {
    if (!LocalLlamaService.instance) {
      LocalLlamaService.instance = new LocalLlamaService();
    }
    return LocalLlamaService.instance;
  }

  public async init() {
    if (this.isLoaded || Platform.OS === 'web') return;

    try {
      const { LLMModule } = require('react-native-executorch');
      const modelInfo = await getInfoAsync(this.paths.model);
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
        generationConfig: { temperature: 0.7, topP: 0.9, maxTokens: 256 }
      });

      this.isLoaded = true;
    } catch (error) {
      console.error('[LocalLlamaService] Ignition failed:', error);
    }
  }

  public async synthesise(query: string): Promise<SynthesisResult> {
    if (!this.isLoaded || !this.model) {
      return { 
        summary: "Synthesis offline.", 
        connections: [], 
        category: "Journal", 
        emotion: "neutral", 
        resonances: { Journal: 1.0 } 
      };
    }

    try {
      const contextNotes = await RetrievalService.getInstance().executeExplore(query, 5) as Note[];
      const thoughtStream = contextNotes.map((n: Note) => `- ${n.content}`).join('\n');

      const prompt = `
        <|begin_of_text|><|start_header_id|>system<|end_header_id|>
        You are a neural architect for the Drift app. Analyze the new thought in the context of previous memories.
        
        CONTEXT MEMORIES:
        ${thoughtStream}
        
        NEW THOUGHT: "${query}"
        
        Analyze the thought and return exactly this format:
        SUMMARY: [A poetic 1-sentence synthesis]
        CATEGORY: [Exactly one: Journal, Idea, Study, Todo, Dream, Research, Quote, Meeting, Reflection, Creative]
        EMOTION: [1-word emotion: e.g. Focused, Anxious, Inspired, Curious, Calm, etc.]
        RESONANCE: [Category1:0.X, Category2:0.X] (Confidence weights totaling 1.0)
        <|eot_id|><|start_header_id|>assistant<|end_header_id|>
      `;

      console.log(`[Neural Engine] Firing deep synthesis for query: "${query.substring(0, 50)}..."`);
      const response = await this.model.forward(prompt);
      const text = response.trim();
      
      console.log(`[Neural Engine] Raw Response: ${text}`);

      // Robust Multi-Line Parsing
      let category = "Journal";
      let summary = "A thought in the drift.";
      let emotion = "neutral";
      let resonances: Record<string, number> = { Journal: 1.0 };

      const lines = text.split('\n');
      lines.forEach((line: string) => {
        if (line.startsWith('SUMMARY:')) summary = line.replace('SUMMARY:', '').trim();
        if (line.startsWith('CATEGORY:')) category = line.replace('CATEGORY:', '').trim();
        if (line.startsWith('EMOTION:')) emotion = line.replace('EMOTION:', '').trim();
        if (line.startsWith('RESONANCE:')) {
            const resPart = line.replace('RESONANCE:', '').trim();
            const pairs = resPart.replace(/[\[\]]/g, '').split(',');
            pairs.forEach((p: string) => {
                const [c, w] = p.split(':');
                if (c && w) resonances[c.trim()] = parseFloat(w);
            });
        }
      });

      return {
        summary,
        connections: contextNotes.map((n: Note) => n.id),
        category,
        emotion,
        resonances
      };
    } catch (error) {
      console.error(`[LocalLlamaService] Synthesis Failed:`, error);
      return { 
        summary: "Neural static.", 
        connections: [], 
        category: "Journal", 
        emotion: "neutral", 
        resonances: { Journal: 1.0 } 
      };
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
