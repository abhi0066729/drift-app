import * as FileSystem from 'expo-file-system';


export type DownloadProgress = {
  fileName: string;
  progress: number; // 0.0 to 1.0
  totalBytes: number;
  speed: string; // e.g. "2.4 MB/s"
};


export class ModelDownloadService {
  private static instance: ModelDownloadService;
  private static readonly DEBUG_FORCE_MODAL = true; // Set to true to test the download popup
  
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


  private constructor() {}

  public static getInstance(): ModelDownloadService {
    if (!ModelDownloadService.instance) {
      ModelDownloadService.instance = new ModelDownloadService();
    }
    return ModelDownloadService.instance;
  }

  /**
   * Orchestrates the download of all required AI models.
   */
  public async ensureModelsPresent(onProgress: (p: DownloadProgress) => void): Promise<boolean> {
    console.log('[ModelDownloadService] Forcing simulation for UI testing...');
    
    // FAKE DOWNLOAD SIMULATION so the UI can be tested
    for (const model of this.MODELS) {
      let progress = 0;
      while (progress < 1) {
        progress += Math.random() * 0.15;
        if (progress > 1) progress = 1;
        
        onProgress({
          fileName: model.name,
          progress: progress,
          totalBytes: 500000000,
          speed: `${(2 + Math.random() * 5).toFixed(1)} MB/s`
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
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
    if (ModelDownloadService.DEBUG_FORCE_MODAL) return false;
    try {
      const modelPath = `${FileSystem.documentDirectory}models/Llama-3.2-1B-Instruct-Q4_K_M.gguf`;
      const info = await FileSystem.getInfoAsync(modelPath);
      return info.exists;
    } catch (e) {
      return false;
    }
  }

}
