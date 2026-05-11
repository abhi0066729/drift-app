import * as FileSystem from 'expo-file-system/legacy';
import { documentDirectory, getInfoAsync } from 'expo-file-system/legacy';


export type DownloadProgress = {
  fileName: string;
  progress: number; // 0.0 to 1.0
  totalBytes: number;
  speed: string; // e.g. "2.4 MB/s"
};


export class ModelDownloadService {
  private static instance: ModelDownloadService;
  private static readonly DEBUG_FORCE_MODAL = false; // Set to false for production

  // Official Drift Model Repository (drift-labs organization)
  private readonly HF_REPOS = {
    base: 'https://huggingface.co/drift-labs/base/resolve/main',
    embedding: 'https://huggingface.co/drift-labs/embedding/resolve/main'
  };

  private readonly MODELS = [
    { name: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf', size: '808MB', repo: 'base' },
    { name: 'model_quantized.onnx', size: '31MB', repo: 'embedding' },
    { name: 'tokenizer.json', size: '17.2MB', repo: 'base' },
    { name: 'tokenizer_config.json', size: '56KB', repo: 'base' }
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
    const totalExpectedSize = 839 * 1024 * 1024; // ~839MB total
    let totalBytesWritten = 0;

    const modelsDir = `${FileSystem.documentDirectory}models/`;
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }

    for (const model of this.MODELS) {
      const localPath = `${modelsDir}${model.name}`;
      
      // Check if already exists to skip or update progress
      const info = await FileSystem.getInfoAsync(localPath);
      if (info.exists && info.size > 1000000) { // Simple sanity check for real file
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
        // Calculate cumulative progress
        const currentTotal = totalBytesWritten + (p.progress * (p.totalBytes || 0));
        onProgress({
          fileName: p.fileName,
          progress: Math.min(currentTotal / totalExpectedSize, 1),
          totalBytes: totalExpectedSize,
          speed: p.speed
        });
      });

      const finalInfo = await FileSystem.getInfoAsync(localPath);
      if (finalInfo.exists) {
        totalBytesWritten += finalInfo.size;
      }
    }
    return true;
  }

  private async downloadFile(model: { name: string, repo: string }, localPath: string, onProgress: (p: DownloadProgress) => void) {
    const repoUrl = this.HF_REPOS[model.repo as keyof typeof this.HF_REPOS] || this.HF_REPOS.base;
    const url = `${repoUrl}/${model.name}`;
    const startTime = Date.now();
    let lastBytes = 0;

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localPath,
      {},
      (progressData) => {
        const now = Date.now();
        const durationSec = (now - startTime) / 1000;
        const speedMbps = durationSec > 0 ? (progressData.totalBytesWritten / 1024 / 1024 / durationSec) : 0;
        const speedLabel = speedMbps > 1 ? `${speedMbps.toFixed(1)} MB/s` : `${(speedMbps * 1024).toFixed(0)} KB/s`;

        const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
        onProgress({
          fileName: model.name,
          progress,
          totalBytes: progressData.totalBytesExpectedToWrite,
          speed: speedLabel
        });
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error(`Download of ${model.name} failed`);

    console.log(`[ModelDownloadService] Successfully saved ${model.name} to ${result.uri}`);
  }


  /**
   * Checks if synthesis is ready.
   */
  public async isModelReady(): Promise<boolean> {
    // 1. Immediate exit for debug/testing
    if (ModelDownloadService.DEBUG_FORCE_MODAL) return false;

    try {
      // 2. Safety check for the native module
      if (!documentDirectory) {
        console.warn('[ModelDownloadService] documentDirectory not available');
        return false;
      }

      const modelPath = `${documentDirectory}models/Llama-3.2-1B-Instruct-Q4_K_M.gguf`;
      const info = await getInfoAsync(modelPath);
      return info.exists;
    } catch (e) {
      console.error('[ModelDownloadService] Ready check failed:', e);
      return false;
    }
  }

}
