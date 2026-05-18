// @ts-ignore
import { documentDirectory, getInfoAsync, makeDirectoryAsync, createDownloadResumable } from 'expo-file-system/legacy';


export type DownloadProgress = {
  fileName: string;
  progress: number; // 0.0 to 1.0
  totalBytes: number;
  speed: string; // e.g. "2.4 MB/s"
};


export class ModelDownloadService {
  private static instance: ModelDownloadService;
  private static readonly DEBUG_FORCE_MODAL = false; // Set to false for production

  // Official Drift Model Repository (drift-labs organization & Software Mansion official ExecuTorch)
  private readonly HF_REPOS = {
    base: 'https://huggingface.co/drift-labs/base/resolve/main',
    embedding: 'https://huggingface.co/drift-labs/embedding/resolve/main'
  };

  private readonly MODELS = [
    { 
      name: 'llama3_2_spinquant.pte', 
      downloadPath: 'llama3_2_spinquant.pte', 
      size: '1.08GB', 
      repo: 'base' 
    },
    { 
      name: 'model_quantized.onnx', 
      downloadPath: 'model_quantized.onnx', 
      size: '31MB', 
      repo: 'embedding' 
    },
    { 
      name: 'tokenizer.json', 
      downloadPath: 'tokenizer.json', 
      size: '17.2MB', 
      repo: 'base' 
    },
    { 
      name: 'tokenizer_config.json', 
      downloadPath: 'tokenizer_config.json', 
      size: '56KB', 
      repo: 'base' 
    },
    { 
      name: 'embedding_tokenizer.json', 
      downloadPath: 'tokenizer.json', 
      size: '14MB', 
      repo: 'embedding' 
    },
    { 
      name: 'embedding_tokenizer_config.json', 
      downloadPath: 'tokenizer_config.json', 
      size: '1KB', 
      repo: 'embedding' 
    }
  ];


  private constructor() { }

  public static getInstance(): ModelDownloadService {
    if (!ModelDownloadService.instance) {
      ModelDownloadService.instance = new ModelDownloadService();
    }
    return ModelDownloadService.instance;
  }

  /**
   * Orchestrates the download of all required AI models with unified progress.
   */
  public async ensureModelsPresent(onProgress: (p: DownloadProgress) => void): Promise<boolean> {
    const totalExpectedSize = 1131 * 1024 * 1024; // ~1.13GB total (Optimized model size)
    let totalBytesWritten = 0;

    const modelsDir = `${documentDirectory}models/`;
    
    // Ensure directory exists
    const dirInfo = await getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(modelsDir, { intermediates: true });
    } else {
      // Cleanup obsolete 808MB GGUF model to free up storage
      const obsoletePath = `${modelsDir}Llama-3.2-1B-Instruct-Q4_K_M.gguf`;
      const obsoleteInfo = await getInfoAsync(obsoletePath);
      if (obsoleteInfo.exists) {
        const { deleteAsync } = require('expo-file-system/legacy');
        await deleteAsync(obsoletePath).catch(() => {});
        console.log('[ModelDownloadService] Cleaned up obsolete GGUF model file.');
      }
    }

    for (const model of this.MODELS) {
      const localPath = `${modelsDir}${model.name}`;
      
      // Check if already exists to skip or update progress
      const info = await getInfoAsync(localPath);
      if (info.exists && info.size > 1000000) {
        totalBytesWritten += info.size;
        onProgress({
          fileName: model.name,
          progress: Math.min(totalBytesWritten / totalExpectedSize, 1),
          totalBytes: totalExpectedSize,
          speed: 'READY'
        });
        continue;
      }

      await this.downloadFile(model, localPath, (p) => {
        const currentTotal = totalBytesWritten + (p.progress * (p.totalBytes || 0));
        onProgress({
          fileName: p.fileName,
          progress: Math.min(currentTotal / totalExpectedSize, 1),
          totalBytes: totalExpectedSize,
          speed: p.speed
        });
      });

      const finalInfo = await getInfoAsync(localPath);
      if (finalInfo.exists) {
        totalBytesWritten += finalInfo.size;
      }
    }
    return true;
  }

  private async downloadFile(model: { name: string, downloadPath: string, repo: string }, localPath: string, onProgress: (p: DownloadProgress) => void) {
    const repoUrl = this.HF_REPOS[model.repo as keyof typeof this.HF_REPOS] || this.HF_REPOS.base;
    const url = `${repoUrl}/${model.downloadPath}`;
    const startTime = Date.now();

    const downloadResumable = createDownloadResumable(
      url,
      localPath,
      {},
      (progressData: any) => {
        const now = Date.now();
        const durationSec = (now - startTime) / 1000;
        
        let speedLabel = '...';
        if (durationSec > 0) {
          const speedMbps = (progressData.totalBytesWritten / 1024 / 1024 / durationSec);
          speedLabel = speedMbps > 1 ? `${speedMbps.toFixed(1)} MB/s` : `${(speedMbps * 1024).toFixed(0)} KB/s`;
        }

        const total = progressData.totalBytesExpectedToWrite;
        const written = progressData.totalBytesWritten;
        const progress = (total > 0) ? (written / total) : 0;

        onProgress({
          fileName: model.name,
          progress: isFinite(progress) ? progress : 0,
          totalBytes: total > 0 ? total : 0,
          speed: speedLabel
        });
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error(`Download of ${model.name} failed`);

    console.log(`[ModelDownloadService] Successfully saved ${model.name} to ${result.uri}`);
  }


  /**
   * Checks if all required AI assets are fully present and valid.
   * Includes a safety timeout to prevent hanging on device filesystem.
   */
  public async isModelReady(): Promise<boolean> {
    if (ModelDownloadService.DEBUG_FORCE_MODAL) return false;

    // Safety timeout: If filesystem check takes > 5s, something is wrong
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Model Readiness Timeout')), 5000)
    );

    const checkPromise = (async () => {
      try {
        if (!documentDirectory) return false;
        const modelsDir = `${documentDirectory}models/`;

        for (const model of this.MODELS) {
          const path = `${modelsDir}${model.name}`;
          const info = await getInfoAsync(path);
          // Models must exist and be of meaningful size (not empty markers)
          if (!info.exists || info.size < 1000) return false;
        }
        return true;
      } catch (e) {
        console.error('[ModelDownloadService] Ready check failed:', e);
        return false;
      }
    })();

    try {
      return await Promise.race([checkPromise, timeoutPromise]);
    } catch (e) {
      console.warn('[ModelDownloadService] Readiness check stalled, defaulting to NOT_READY');
      return false;
    }
  }

}
