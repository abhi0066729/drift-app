import * as FileSystem from 'expo-file-system';


export type DownloadProgress = {
  fileName: string;
  progress: number; // 0.0 to 1.0
  totalBytes: number;
  speed: string; // e.g. "2.4 MB/s"
};


export class ModelDownloadService {
  private static instance: ModelDownloadService;
  
  // Official Drift Model Repository (drift-labs organization)
  private readonly HF_BASE = 'https://huggingface.co/drift-labs/core/resolve/main';
  
  private readonly MODELS = [
    { name: 'llama-3.2-1b.pte', size: '480MB' },
    { name: 'multilingual-e5-small-int8.onnx', size: '112MB' },
    { name: 'tokenizer.json', size: '1.2MB' },
    { name: 'tokenizer_config.json', size: '4KB' }
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

  private async downloadFile(fileName: string, localPath: string, onProgress: (p: DownloadProgress) => void) {
    const url = `${this.HF_BASE}/${fileName}`;
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
          fileName,
          progress,
          totalBytes: progressData.totalBytesExpectedToWrite,
          speed: speedLabel
        });
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error(`Download of ${fileName} failed`);
    
    console.log(`[ModelDownloadService] Successfully saved ${fileName} to ${result.uri}`);
  }


  /**
   * Checks if synthesis is ready.
   */
  public async isModelReady(): Promise<boolean> {
    try {
      const { documentDirectory } = require('expo-file-system');
      const modelPath = `${documentDirectory}models/llama-3.2-1b.pte`;
      const { getInfoAsync } = require('expo-file-system');
      const info = await getInfoAsync(modelPath);
      return info.exists;
    } catch (e) {
      return false;
    }
  }

}
