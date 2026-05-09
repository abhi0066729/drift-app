import { AutoTokenizer, env } from '@xenova/transformers';
import { Platform } from 'react-native';

// Configure environment for local usage
env.allowLocalModels = true;
env.allowRemoteModels = false;

export class EmbeddingEngine {
  private static instance: EmbeddingEngine;
  private session: any = null;
  private tokenizer: any = null;
  private initialized: boolean = false;
  private ort: any = null;

  private constructor() { }

  public static getInstance(): EmbeddingEngine {
    if (!EmbeddingEngine.instance) {
      EmbeddingEngine.instance = new EmbeddingEngine();
    }
    return EmbeddingEngine.instance;
  }

  public async init() {
    if (this.initialized || Platform.OS === 'web') return;

    try {
      console.log('[EmbeddingEngine] Initializing...');
      
      // Dynamic imports to prevent export-time crashes
      const FileSystem = require('expo-file-system');
      this.ort = require('onnxruntime-react-native');
      
      const modelsDir = `${(FileSystem as any).documentDirectory}models/`;

      // 1. Load Tokenizer
      this.tokenizer = await AutoTokenizer.from_pretrained(
        modelsDir,
        { local_files_only: true }
      );

      // 2. Load ONNX Model
      const modelPath = `${modelsDir}multilingual-e5-small-int8.onnx`;
      this.session = await this.ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
      });

      this.initialized = true;
      console.log('[EmbeddingEngine] Ready.');

    } catch (error) {
      console.error('[EmbeddingEngine] Initialization failed:', error);
      throw error;
    }
  }

  public async embed(text: string, isQuery: boolean = false): Promise<Float32Array> {
    if (!this.initialized) await this.init();
    if (!this.session) throw new Error('Session not initialized');

    const prefix = isQuery ? 'query: ' : 'passage: ';
    const fullText = `${prefix}${text}`;

    const { input_ids, attention_mask } = await this.tokenizer(fullText, {
      padding: true,
      truncation: true,
      maxLength: 512,
    });

    const inputTensor = new this.ort.Tensor('int64', BigInt64Array.from(input_ids.data), input_ids.dims);
    const maskTensor = new this.ort.Tensor('int64', BigInt64Array.from(attention_mask.data), attention_mask.dims);

    const results = await this.session.run({
      input_ids: inputTensor,
      attention_mask: maskTensor,
    });

    const pooled = this.meanPool(results.last_hidden_state, attention_mask);
    return this.normalize(pooled);
  }

  public async unload(): Promise<void> {
    if (this.session) {
      this.session = null;
    }
    this.initialized = false;
  }

  private meanPool(lastHiddenState: any, attentionMask: any): Float32Array {
    const [batchSize, seqLen, dim] = lastHiddenState.dims;
    const data = lastHiddenState.data as Float32Array;
    const maskData = attentionMask.data as Int32Array | BigInt64Array;

    const pooled = new Float32Array(dim);
    let validTokenCount = 0;

    for (let s = 0; s < seqLen; s++) {
      const isMasked = Number(maskData[s]) === 0;
      if (isMasked) continue;

      validTokenCount++;
      for (let d = 0; d < dim; d++) {
        pooled[d] += data[s * dim + d];
      }
    }

    for (let d = 0; d < dim; d++) {
      pooled[d] /= Math.max(validTokenCount, 1);
    }

    return pooled;
  }

  private normalize(vector: Float32Array): Float32Array {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq);
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= Math.max(norm, 1e-12);
    }
    return vector;
  }
}
