// @ts-ignore - TS defs are stale but this works at runtime
import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Note } from '../store/useNotesStore';
import { RetrievalService } from './RetrievalService';
import { Logger } from './Logger';

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
    model: `${documentDirectory}models/llama3_2_spinquant.pte`,
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
      // STEP 1: Dynamic imports
      Logger.log('[NeuralInit] Step 1: Importing ExecuTorch modules...');
      const { LLMModule, initExecutorch } = require('react-native-executorch');
      const { ExpoResourceFetcher } = require('react-native-executorch-expo-resource-fetcher');
      Logger.log('[NeuralInit] Step 1: OK - Modules imported.');
      
      // STEP 2: Verify model file exists on disk
      Logger.log(`[NeuralInit] Step 2: Checking model at: ${this.paths.model}`);
      const modelInfo = await getInfoAsync(this.paths.model);
      if (!modelInfo.exists) {
        Logger.log('[NeuralInit] Step 2: ABORT - Model file does not exist on disk.');
        return;
      }
      Logger.log(`[NeuralInit] Step 2: OK - Model exists, size=${modelInfo.size} bytes`);

      // STEP 3: Verify tokenizer files
      const tokInfo = await getInfoAsync(this.paths.tokenizer);
      const cfgInfo = await getInfoAsync(this.paths.config);
      Logger.log(`[NeuralInit] Step 3: tokenizer exists=${tokInfo.exists} size=${tokInfo.exists ? tokInfo.size : 0}, config exists=${cfgInfo.exists} size=${cfgInfo.exists ? cfgInfo.size : 0}`);
      if (!tokInfo.exists || !cfgInfo.exists) {
        Logger.log('[NeuralInit] Step 3: ABORT - Tokenizer files missing.');
        return;
      }

      // STEP 4: Initialize ExecuTorch resource fetcher adapter
      Logger.log('[NeuralInit] Step 4: Initializing ExecuTorch adapter...');
      initExecutorch({ resourceFetcher: ExpoResourceFetcher });
      Logger.log('[NeuralInit] Step 4: OK - Adapter registered.');

      // STEP 5: Load model via JSI bridge
      Logger.log('[NeuralInit] Step 5: Loading model via LLMModule.fromCustomModel()...');
      this.model = await LLMModule.fromCustomModel(
        this.paths.model,
        this.paths.tokenizer,
        this.paths.config,
        (progress: number) => {
          if (Math.round(progress * 100) % 25 === 0) {
             Logger.log(`[NeuralInit] Step 5: Loading ${Math.round(progress * 100)}%`);
          }
        }
      );
      Logger.log('[NeuralInit] Step 5: OK - Model loaded into memory.');

      // STEP 6: Configure generation parameters
      Logger.log('[NeuralInit] Step 6: Configuring generation parameters...');
      this.model.configure({
        generationConfig: { temperature: 0.3, topP: 0.9 }
      });
      Logger.log('[NeuralInit] Step 6: OK - Configuration applied.');

      this.isLoaded = true;
      Logger.log('[NeuralInit] ✅ Neural Engine ignition successful. All 6 steps passed.');
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      const errCode = error?.code || 'UNKNOWN';
      Logger.error(`[NeuralInit] ❌ FAILED at runtime. Code=${errCode} Message=${errMsg}`, error);
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
      // Context retrieval is best-effort — synthesis works without it
      let contextNotes: Note[] = [];
      try {
        contextNotes = await RetrievalService.getInstance().executeExplore(query, 5) as Note[];
      } catch (ctxError) {
        console.warn('[Neural Engine] Context retrieval failed (index may be empty), proceeding without context.');
      }
      const thoughtStream = contextNotes.map((n: Note) => `- ${n.content}`).join('\n');

      const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

Classify the user's thought into exactly one category and extract the emotion.

Categories with examples:
- Idea: "I want to build an app", "muje ek translation app banana hai", plans, inventions, projects
- Todo: "I need to", "Remember to", "Buy groceries", tasks, reminders
- Study: "I learned that", "How does X work", notes from class, research findings
- Journal: "Today I felt", "Had a great day", personal diary entries
- Dream: "I dreamed about", "Last night I saw", sleep dreams
- Reflection: "Looking back", "I realize now", self-analysis, life lessons
- Research: "According to the paper", "Studies show", academic or deep investigation
- Quote: Direct quotes from others, book passages, sayings
- Meeting: "Met with", "Discussion about", work meetings, calls
- Creative: Poetry, stories, song lyrics, art descriptions

Respond in EXACTLY this format (nothing else):
SUMMARY: one sentence describing the thought
CATEGORY: one word from the list above
EMOTION: one word emotion<|eot_id|><|start_header_id|>user<|end_header_id|>

${query}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;

      Logger.log(`Firing deep synthesis for note: ${query.substring(0, 20)}...`);
      const response = await this.model.forward(prompt);
      const text = response.trim();
      
      console.log(`[Neural Engine] Raw Response: ${text}`);

      // Robust Multi-Line Parsing
      const VALID_CATEGORIES = ['Journal', 'Idea', 'Study', 'Todo', 'Dream', 'Research', 'Quote', 'Meeting', 'Reflection', 'Creative'];
      let category = "Journal";
      let summary = "A thought in the drift.";
      let emotion = "neutral";

      const lines = text.split('\n');
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('SUMMARY:')) summary = trimmed.replace('SUMMARY:', '').trim();
        if (trimmed.startsWith('CATEGORY:')) {
          const raw = trimmed.replace('CATEGORY:', '').trim();
          // Find closest valid category (case-insensitive match)
          const match = VALID_CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase());
          category = match || "Journal";
        }
        if (trimmed.startsWith('EMOTION:')) emotion = trimmed.replace('EMOTION:', '').trim();
      });

      // Auto-derive resonances from the classified category
      const resonances: Record<string, number> = { [category]: 1.0 };

      return {
        summary,
        connections: contextNotes.map((n: Note) => n.id),
        category,
        emotion,
        resonances
      };
    } catch (error) {
      Logger.error('Synthesis inference failed', error, { query: query.substring(0, 100) });
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
