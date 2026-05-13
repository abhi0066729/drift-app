type BrainType = 'none' | 'embedding' | 'synthesis';

/**
 * ResourceCoordinator.ts
 * 
 * THE NEURAL MUTEX:
 * - Ensures Llama and ONNX never coexist in RAM.
 * - Minimal impact: No UI changes, purely background memory management.
 */
export class ResourceCoordinator {
  private static instance: ResourceCoordinator;
  private currentBrain: BrainType = 'none';
  private idleTimer: any = null;
  private readonly IDLE_TIMEOUT = 60000; // 60s auto-purge

  private constructor() {}

  public static getInstance(): ResourceCoordinator {
    if (!ResourceCoordinator.instance) {
      ResourceCoordinator.instance = new ResourceCoordinator();
    }
    return ResourceCoordinator.instance;
  }

  public async requestBrain(type: BrainType): Promise<void> {
    if (this.currentBrain === type) {
      this.resetIdleTimer();
      return;
    }

    console.log(`[ResourceCoordinator] Memory handoff: ${this.currentBrain} -> ${type}`);

    // Force purge the other model before loading the new one
    if (this.currentBrain === 'embedding' || type === 'synthesis') {
      const { EmbeddingEngine } = require('./EmbeddingEngine');
      await EmbeddingEngine.getInstance().unload();
    }
    
    if (this.currentBrain === 'synthesis' || type === 'embedding') {
      const { LocalLlamaService } = require('./LocalLlamaService');
      await LocalLlamaService.getInstance().unload();
    }

    // Initialize the requested model
    if (type === 'embedding') {
      const { EmbeddingEngine } = require('./EmbeddingEngine');
      await EmbeddingEngine.getInstance().init();
    } else if (type === 'synthesis') {
      const { LocalLlamaService } = require('./LocalLlamaService');
      await LocalLlamaService.getInstance().init();
    }

    this.currentBrain = type;
    this.resetIdleTimer();
  }

  public releaseBrain() {
    this.resetIdleTimer();
  }

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(async () => {
      console.log(`[ResourceCoordinator] Neural idle: purging all models from memory.`);
      const { EmbeddingEngine } = require('./EmbeddingEngine');
      const { LocalLlamaService } = require('./LocalLlamaService');
      await EmbeddingEngine.getInstance().unload();
      await LocalLlamaService.getInstance().unload();
      this.currentBrain = 'none';
    }, this.IDLE_TIMEOUT);
  }
}
