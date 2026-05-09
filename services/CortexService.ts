import { LocalLlamaService } from './LocalLlamaService';
import { EmbeddingEngine } from './EmbeddingEngine';
import { VectorSearchService } from './VectorSearchService';

export type AppMode = 'nexus' | 'capture' | 'search' | 'background';

export class CortexService {
  private static instance: CortexService;
  private currentMode: AppMode = 'background';

  private constructor() {}

  public static getInstance(): CortexService {
    if (!CortexService.instance) {
      CortexService.instance = new CortexService();
    }
    return CortexService.instance;
  }

  private unloadTimeout: NodeJS.Timeout | null = null;
  private readonly WARM_STATE_DURATION = 60000; // 60 seconds

  /**
   * Switches the app's AI state based on the current UI focus.
   * Optimized with a "Warm State" cooldown for Llama.
   */
  public async transitionTo(mode: AppMode) {
    if (this.currentMode === mode) return;
    
    console.log(`[Cortex] Transitioning: ${this.currentMode} -> ${mode}`);
    this.currentMode = mode;

    // Clear any pending unloads
    if (this.unloadTimeout) {
      clearTimeout(this.unloadTimeout);
      this.unloadTimeout = null;
    }

    switch (mode) {
      case 'capture':
        await EmbeddingEngine.getInstance().init();
        await LocalLlamaService.getInstance().init();
        break;

      case 'nexus':
        // Start a "Warm State" timer instead of instant unload
        this.unloadTimeout = setTimeout(async () => {
          console.log('[Cortex] Warm state expired. Purging Llama from RAM.');
          await LocalLlamaService.getInstance().unload();
        }, this.WARM_STATE_DURATION);

        await VectorSearchService.getInstance().init();
        break;

      case 'search':
        await EmbeddingEngine.getInstance().init();
        await VectorSearchService.getInstance().init();
        break;

      case 'background':
        await LocalLlamaService.getInstance().unload();
        await EmbeddingEngine.getInstance().unload();
        break;
    }
  }


  /**
   * The "Neural Chain": Coordinates multiple models to evolve a single thought.
   */
  public async evolveThought(noteContent: string) {
    console.log('[Cortex] Evolving thought chain...');
    
    // 1. Semantic Search (E5 + HNSW)
    // Find the neighborhood where this thought belongs
    const neighborhood = await VectorSearchService.getInstance().search(
      await EmbeddingEngine.getInstance().embed(noteContent, true),
      8
    );

    // 2. Local Synthesis (Llama)
    // Weave the narrative connection
    const synthesis = await LocalLlamaService.getInstance().synthesise(noteContent);

    // 3. Recursive Re-indexing
    // In Phase 5, we would embed the synthesis itself to create "High-Order Notes"
    
    return synthesis;
  }
}
