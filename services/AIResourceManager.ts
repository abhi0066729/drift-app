import { EmbeddingEngine } from './EmbeddingEngine';
import { LocalLlamaService } from './LocalLlamaService';

export type AIResourceMode = 'idle' | 'embedding' | 'synthesis';

/**
 * AI RESOURCE MANAGER (Mammoth Scale)
 * Orchestrates the lifecycle of high-memory AI models to prevent OOM.
 * Rule: Only one heavy model (Llama or Embedding) can be in RAM at a time.
 */
export class AIResourceManager {
  private static instance: AIResourceManager;
  private currentMode: AIResourceMode = 'idle';
  private lock: boolean = false;

  private constructor() {}

  public static getInstance(): AIResourceManager {
    if (!AIResourceManager.instance) {
      AIResourceManager.instance = new AIResourceManager();
    }
    return AIResourceManager.instance;
  }

  /**
   * Request a specific AI engine mode.
   * Automatically unloads the competing model if necessary.
   */
  public async requestMode(mode: AIResourceMode): Promise<void> {
    if (this.currentMode === mode) return;
    
    // Simple Mutex
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.lock = true;

    try {
      console.log(`[AIResourceManager] Mode change: ${this.currentMode} -> ${mode}`);

      // 1. Unload everything if switching to idle
      if (mode === 'idle' || this.currentMode !== 'idle') {
        await this.unloadAll();
      }

      // 2. Load requested model
      if (mode === 'embedding') {
        await EmbeddingEngine.getInstance().init();
      } else if (mode === 'synthesis') {
        await LocalLlamaService.getInstance().init();
      }

      this.currentMode = mode;
    } catch (e) {
      console.error('[AIResourceManager] Mode change failed:', e);
      await this.unloadAll();
    } finally {
      this.lock = false;
    }
  }

  public async unloadAll(): Promise<void> {
    console.log('[AIResourceManager] Unloading all heavy AI resources...');
    await EmbeddingEngine.getInstance().unload();
    await LocalLlamaService.getInstance().unload();
    this.currentMode = 'idle';
  }

  public getCurrentMode(): AIResourceMode {
    return this.currentMode;
  }
}
