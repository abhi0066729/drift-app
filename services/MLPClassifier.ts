import { NoteCategory } from './ai';

interface ClassifierWeights {
  W1_cat: number[][]; // (128, 384)
  b1_cat: number[];   // (128,)
  W2_cat: number[][]; // (10, 128)
  b2_cat: number[];   // (10,)
  W1_emo: number[][]; // (128, 384)
  b1_emo: number[];   // (128,)
  W2_emo: number[][]; // (7, 128)
  b2_emo: number[];   // (7,)
  categories: string[];
  emotions: string[];
}

export class MLPClassifier {
  private static weights: ClassifierWeights | null = null;
  private static isLoaded = false;

  private static loadWeights() {
    if (this.isLoaded) return;
    try {
      // Require maps directly to standard bundled asset in React Native/Metro
      this.weights = require('../assets/models/classifier_weights.json');
      this.isLoaded = true;
      console.log('[MLPClassifier] Successfully loaded classifier weights.');
    } catch (error) {
      console.error('[MLPClassifier] Failed to load weights:', error);
    }
  }

  private static relu(arr: Float32Array): Float32Array {
    const out = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      out[i] = Math.max(0, arr[i]);
    }
    return out;
  }

  private static softmax(arr: Float32Array): Float32Array {
    const out = new Float32Array(arr.length);
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > max) max = arr[i];
    }
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      out[i] = Math.exp(arr[i] - max);
      sum += out[i];
    }
    for (let i = 0; i < arr.length; i++) {
      out[i] /= Math.max(sum, 1e-12);
    }
    return out;
  }

  private static matMul(W: number[][], x: Float32Array, b: number[]): Float32Array {
    const outDim = W.length;
    const inDim = W[0].length;
    const out = new Float32Array(outDim);

    for (let i = 0; i < outDim; i++) {
      let sum = b[i];
      const row = W[i];
      for (let j = 0; j < inDim; j++) {
        sum += row[j] * x[j];
      }
      out[i] = sum;
    }
    return out;
  }

  public static predict(embedding: Float32Array): {
    category: NoteCategory;
    emotion: string;
    resonances: Record<string, number>;
  } | null {
    this.loadWeights();
    if (!this.weights) return null;

    try {
      const w = this.weights;

      // 1. Predict Category
      const h_cat = this.relu(this.matMul(w.W1_cat, embedding, w.b1_cat));
      const logits_cat = this.matMul(w.W2_cat, h_cat, w.b2_cat);
      const probs_cat = this.softmax(logits_cat);

      // Find best category
      let bestCatIdx = 0;
      let maxCatProb = -1;
      const resonances: Record<string, number> = {};

      for (let i = 0; i < probs_cat.length; i++) {
        const catName = w.categories[i] as NoteCategory;
        const prob = parseFloat(probs_cat[i].toFixed(2));
        if (prob > 0.01) {
          resonances[catName] = prob;
        }
        if (probs_cat[i] > maxCatProb) {
          maxCatProb = probs_cat[i];
          bestCatIdx = i;
        }
      }
      const bestCategory = w.categories[bestCatIdx] as NoteCategory;

      // 2. Predict Emotion
      const h_emo = this.relu(this.matMul(w.W1_emo, embedding, w.b1_emo));
      const logits_emo = this.matMul(w.W2_emo, h_emo, w.b2_emo);
      const probs_emo = this.softmax(logits_emo);

      let bestEmoIdx = 0;
      let maxEmoProb = -1;
      for (let i = 0; i < probs_emo.length; i++) {
        if (probs_emo[i] > maxEmoProb) {
          maxEmoProb = probs_emo[i];
          bestEmoIdx = i;
        }
      }
      const bestEmotion = w.emotions[bestEmoIdx];

      console.log(`[MLPClassifier] Predicted: ${bestCategory} (${(maxCatProb * 100).toFixed(0)}%) | Emotion: ${bestEmotion}`);

      return {
        category: bestCategory,
        emotion: bestEmotion,
        resonances
      };
    } catch (error) {
      console.error('[MLPClassifier] Prediction failed:', error);
      return null;
    }
  }
}
