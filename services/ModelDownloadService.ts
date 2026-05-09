import { documentDirectory, makeDirectoryAsync, getInfoAsync, createDownloadResumable } from 'expo-file-system/legacy';

export type DownloadProgress = {
  fileName: string;
  progress: number; // 0.0 to 1.0
  totalBytes: number;
};

export class ModelDownloadService {
  private static instance: ModelDownloadService;
  
  // Official Drift Model Repository (Hugging Face)
  private readonly HF_BASE = 'https://huggingface.co/abhi0066729/drift-core/resolve/main';
  
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
    try {
      const modelsDir = `${documentDirectory}models/`;
      const dirInfo = await getInfoAsync(modelsDir);
      
      if (!dirInfo.exists) {
        await makeDirectoryAsync(modelsDir, { intermediates: true });
      }

      for (const model of this.MODELS) {
        const localPath = `${modelsDir}${model.name}`;
        const fileInfo = await getInfoAsync(localPath);

        if (!fileInfo.exists) {
          console.log(`[ModelDownloadService] Downloading ${model.name}...`);
          await this.downloadFile(model.name, localPath, onProgress);
        }
      }

      return true;
    } catch (error) {
      console.error('[ModelDownloadService] Download failed:', error);
      return false;
    }
  }

  private async downloadFile(fileName: string, localPath: string, onProgress: (p: DownloadProgress) => void) {
    const url = `${this.HF_BASE}/${fileName}`;
    
    const downloadResumable = createDownloadResumable(
      url,
      localPath,
      {},
      (progressData) => {
        const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite;
        onProgress({
          fileName,
          progress,
          totalBytes: progressData.totalBytesExpectedToWrite
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
    const modelPath = `${documentDirectory}models/llama-3.2-1b.pte`;
    const info = await getInfoAsync(modelPath);
    return info.exists;
  }
}
