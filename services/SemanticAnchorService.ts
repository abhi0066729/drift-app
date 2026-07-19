import { EmbeddingEngine } from './EmbeddingEngine';

export class SemanticAnchorService {
    private static instance: SemanticAnchorService | null = null;
    private anchorEmbeddings: Record<string, Float32Array> = {};

    private constructor() {}

    public static getInstance(): SemanticAnchorService {
        if (!SemanticAnchorService.instance) {
            SemanticAnchorService.instance = new SemanticAnchorService();
        }
        return SemanticAnchorService.instance;
    }

    public async init(): Promise<void> {
        const anchorTexts = [
            'nostalgia',
            'emotional_escape',
            'future_anxiety',
            'self_doubt',
            'creative_spark',
            'comfort_imagery',
            'unfinished_ambition',
            'relationship_memory',
            'rumination',
            'sensory_memory',
            'planning',
            'avoidance',
            'identity_conflict'
        ];

        for (const anchorText of anchorTexts) {
            try {
                const embedding = await EmbeddingEngine.getInstance().embed(anchorText);
                this.anchorEmbeddings[anchorText] = embedding;
            } catch (error) {
                console.error(`Failed to embed anchor text: ${anchorText}`, error);
            }
        }
    }

    public calculateResonances(noteEmbedding: Float32Array): Record<string, number> {
        const resonances: Record<string, number> = {};

        for (const [anchor, embedding] of Object.entries(this.anchorEmbeddings)) {
            const dotProduct = this.dotProduct(noteEmbedding, embedding);
            const resonanceScore = this.normalizeScore(dotProduct);
            resonances[anchor] = resonanceScore;
        }

        return resonances;
    }

    private dotProduct(a: Float32Array, b: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += a[i] * b[i];
        }
        return sum;
    }

    private normalizeScore(score: number): number {
        // Assuming embeddings are normalized, so the dot product is already in the range [-1, 1]
        // Scale to 0.0 - 1.0 range
        return (score + 1) / 2;
    }
}
