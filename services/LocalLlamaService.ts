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
  cognitive_mode?: string;
  domain_tags?: string[];
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

      // Truncate query to prevent KV cache overflow in static ExecuTorch graph
      const safeQuery = query.length > 300 ? query.substring(0, 300) + '...' : query;

      const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are the semantic brain of the Drift note-taking app. Analyze the user's thought and extract three tiers of metadata, along with a legacy category.

Tier 1: Cognitive Mode (How the user is thinking):
- OBSERVATION: Noticing external facts, events, or sensory details.
- REFLECTION: Processing internal feelings, memories, insights, or diaries.
- INTENTION: Planning, deciding, setting goals, tasks, or future ideas.
- QUESTION: Expressing uncertainty, curiosity, or seeking answers.
- CONNECTION: Explicitly linking or comparing two concepts together.
- SENSATION: Deeply emotional, physical, or mood-heavy somatic logs.
- RECORD: Direct, flat logging of a fact (e.g. quote, book citation, meeting minutes).

Tier 2: Domain Tags (What the thought is about):
Extract 1 to 4 key topic keywords from the content (e.g. "ai, notes, coding", "health, workout", "philosophy, life").

Tier 3: Emotional Register (How it feels):
Choose exactly ONE: ANXIOUS, CALM, EXCITED, SAD, FRUSTRATED, HOPEFUL, NEUTRAL.

Legacy Category Mapping (For backward compatibility):
- Idea (INTENTION + creative concepts/plans)
- Todo (INTENTION + action items/tasks)
- Study (OBSERVATION/RECORD + educational learnings)
- Journal (REFLECTION/SENSATION + daily stream)
- Dream (REFLECTION + sleeping narratives)
- Reflection (REFLECTION + self-evaluation/lessons)
- Research (RECORD/OBSERVATION + analysis/science)
- Quote (RECORD + citations)
- Meeting (RECORD + syncs/calls)
- Creative (INTENTION/REFLECTION + poetry/stories)

Format your response EXACTLY as follows:
REASONING: [Step-by-step thinking explaining the core cognitive mode, domain tags, and legacy category]
SUMMARY: [1 short sentence]
COGNITIVE_MODE: [Exactly one Tier 1 mode]
DOMAIN_TAGS: [Comma-separated list of Tier 2 tags]
EMOTION: [Exactly one Tier 3 register]
CATEGORY: [Exactly one legacy Category from list above]
<|eot_id|><|start_header_id|>user<|end_header_id|>
${safeQuery}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

      Logger.log(`Firing deep synthesis for note: ${query.substring(0, 20)}...`);
      const response = await this.model.forward(prompt);
      const text = response.trim();
      
      console.log(`[Neural Engine] Raw Response: ${text}`);

      // Robust Multi-Line Case-Insensitive Parsing
      const VALID_CATEGORIES = ['Journal', 'Idea', 'Study', 'Todo', 'Dream', 'Research', 'Quote', 'Meeting', 'Reflection', 'Creative'];
      const VALID_MODES = ['OBSERVATION', 'REFLECTION', 'INTENTION', 'QUESTION', 'CONNECTION', 'SENSATION', 'RECORD'];
      let category = "Journal";
      let summary = "A thought in the drift.";
      let emotion = "neutral";
      let cognitive_mode = "REFLECTION";
      let domain_tags: string[] = [];

      const lines = text.split('\n');
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        const reasoningMatch = trimmed.match(/^reasoning:\s*(.*)/i);
        const summaryMatch = trimmed.match(/^summary:\s*(.*)/i);
        const categoryMatch = trimmed.match(/^category:\s*(.*)/i);
        const emotionMatch = trimmed.match(/^emotion:\s*(.*)/i);
        const modeMatch = trimmed.match(/^cognitive_mode:\s*(.*)/i);
        const tagsMatch = trimmed.match(/^domain_tags:\s*(.*)/i);

        if (reasoningMatch) {
          console.log(`[Neural Reasoning]: ${reasoningMatch[1].trim()}`);
        }
        if (summaryMatch) summary = summaryMatch[1].trim();
        if (categoryMatch) {
          const raw = categoryMatch[1].trim();
          const match = VALID_CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase());
          category = match || "Journal";
        }
        if (emotionMatch) emotion = emotionMatch[1].trim();
        if (modeMatch) {
          const raw = modeMatch[1].trim().toUpperCase();
          const match = VALID_MODES.find(m => m === raw);
          cognitive_mode = match || "REFLECTION";
        }
        if (tagsMatch) {
          domain_tags = tagsMatch[1].split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        }
      });

      // Failsafe Legacy Category Override based on the extracted Cognitive Mode and Query keywords
      const lowerQuery = query.toLowerCase();
      if (category === "Journal") {
        if (cognitive_mode === "INTENTION") {
          // If intention contains action or build keywords, it's an Idea, otherwise a Todo!
          if (lowerQuery.includes("app") || lowerQuery.includes("build") || lowerQuery.includes("make") || lowerQuery.includes("create") || lowerQuery.includes("design") || lowerQuery.includes("banana") || lowerQuery.includes("project")) {
            category = "Idea";
          } else {
            category = "Todo";
          }
        } else if (cognitive_mode === "QUESTION") {
          category = "Research"; // Map questions to Research / Study
        } else if (cognitive_mode === "RECORD") {
          if (lowerQuery.includes("said") || lowerQuery.includes("quote") || lowerQuery.includes("\"")) {
            category = "Quote";
          } else {
            category = "Study";
          }
        }
      }

      // Auto-derive resonances from the classified category
      const resonances: Record<string, number> = { [category]: 1.0 };

      // Dynamically blend categories of semantically related contextNotes (nearest neighbors)
      contextNotes.forEach((n: Note) => {
        if (n.category) {
          if (!resonances[n.category]) {
            resonances[n.category] = 0.5; // 50% resonance with connected categories
          } else {
            resonances[n.category] = Math.max(resonances[n.category], 0.5);
          }
        }
      });

      return {
        summary,
        connections: contextNotes.map((n: Note) => n.id),
        category,
        emotion,
        resonances,
        cognitive_mode,
        domain_tags
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
