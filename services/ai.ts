// Neural Bridge: Lazy-load Llama to avoid circular imports
export const getLlama = () => require('./LocalLlamaService').LocalLlamaService.getInstance();

export type NoteCategory = string;

import { SEMANTIC_INTENTS, EMOTION_MAP } from './regexMaps';
import { SemanticAnchorService } from './SemanticAnchorService';

export type SemanticMetadata = {
  category: string; // Legacy/Display category
  primaryCategory: string; // The dynamically resolved category from anchors
  surfaceTags: string[]; // Fast keyword/surface tags
  deepTags: Record<string, number>; // Deep psychological resonance anchors
  resonances: Record<string, number>; // All resonance maps
  emotion: string;
  intent?: string;
  people: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency: 'high' | 'medium' | 'low';
  dates: string[];
  clusterId?: string | number;
};

/**
 * Normalizes legacy entities_json notes to the new SemanticMetadata contract
 */
export function normalizeMetadata(entitiesJsonStr: string | null | undefined, content?: string): SemanticMetadata {
  const defaultMetadata: SemanticMetadata = {
    category: 'Journal',
    primaryCategory: 'Journal',
    surfaceTags: [],
    deepTags: {},
    resonances: { Journal: 1.0 },
    emotion: 'Neutral',
    people: [],
    topics: [],
    sentiment: 'neutral',
    urgency: 'low',
    dates: [],
  };

  if (!entitiesJsonStr) {
    if (content) {
      // Heuristic fallback if we have content but no JSON
      const provisional = extractRealtime(content);
      return provisional;
    }
    return defaultMetadata;
  }

  try {
    const parsed = JSON.parse(entitiesJsonStr);
    
    // Support legacy structures
    const category = parsed.category || 'Journal';
    const emotion = parsed.emotion || 'Neutral';
    const resonances = parsed.resonances || { [category]: 1.0 };
    const deepTags = parsed.deepTags || parsed.resonances || {};
    const surfaceTags = parsed.surfaceTags || parsed.domain_tags || parsed.topics || [];
    const topics = parsed.topics || parsed.domain_tags || [];
    const people = parsed.people || [];
    const sentiment = parsed.sentiment || 'neutral';
    const urgency = parsed.urgency || 'low';
    const dates = parsed.dates || [];

    return {
      category,
      primaryCategory: parsed.primaryCategory || category,
      surfaceTags,
      deepTags,
      resonances,
      emotion,
      intent: parsed.intent || undefined,
      people,
      topics,
      sentiment,
      urgency,
      dates,
      clusterId: parsed.clusterId,
    };
  } catch (e) {
    console.error('[ai.ts] Failed to parse entities_json, falling back to heuristics:', e);
    if (content) {
      return extractRealtime(content);
    }
    return defaultMetadata;
  }
}

/**
 * PRELIMINARY INTENT PREDICTION (100% Local Heuristics)
 * Used only for real-time UI feedback during capture.
 * DO NOT use this for final database categorization.
 */
export function extractRealtime(text: string): SemanticMetadata {
  const low = text.toLowerCase();
  
  const defaultMeta: SemanticMetadata = {
    category: 'Journal',
    primaryCategory: 'Journal',
    surfaceTags: [],
    deepTags: {},
    resonances: { Journal: 1.0 },
    emotion: 'Neutral',
    people: [],
    topics: [],
    sentiment: 'neutral',
    urgency: 'low',
    dates: [],
  };

  if (!low.trim()) return defaultMeta;

  let bestCategory = 'Journal';
  let highestScore = 0;
  const resonances: Record<string, number> = {};
  const rawScores: Record<string, number> = {};
  let totalScore = 0;

  const categories = ['Journal', 'Study', 'Idea', 'Todo', 'Dream', 'Research', 'Quote', 'Meeting', 'Reflection', 'Creative'];
  categories.forEach(c => rawScores[c] = 0);

  // Heuristic boosts
  const actionWords = ['make', 'build', 'create', 'develop', 'design', 'planning to', 'plan to', 'banaye', 'banana', 'banane', 'soch raha'];
  const targetWords = ['app', 'bot', 'website', 'software', 'tool', 'product', 'startup', 'business', 'platform', 'system', 'device', 'game'];
  const hasAction = actionWords.some(action => low.includes(action));
  const hasTarget = targetWords.some(target => low.includes(target));
  const hasDirectIdea = ['what if', 'how about', 'let\'s build', 'let\'s make', 'vichaar', 'concept'].some(k => low.includes(k));

  if (hasDirectIdea || (hasAction && hasTarget)) {
    rawScores['Idea'] = 10;
  }

  for (const [cat, patterns] of Object.entries(SEMANTIC_INTENTS)) {
    let score = rawScores[cat] || 0;
    patterns.forEach(pattern => {
      const matches = low.match(pattern);
      if (matches) score += matches.length;
    });
    
    rawScores[cat] = score;
    totalScore += score;

    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat;
    }
  }

  if (totalScore === 0) {
    resonances['Journal'] = 1.0;
  } else {
    for (const [cat, score] of Object.entries(rawScores)) {
      if (score > 0) {
        resonances[cat] = parseFloat((score / totalScore).toFixed(2));
      }
    }
  }

  let bestEmotion = 'Neutral';
  let highestEmoScore = 0;
  for (const [emo, patterns] of Object.entries(EMOTION_MAP)) {
    patterns.forEach(p => {
      const matches = low.match(p);
      if (matches) {
        highestEmoScore += matches.length;
        bestEmotion = emo;
      }
    });
  }

  // Quick extract topic keywords
  const words = low.split(/\s+/).filter(w => w.length > 4);
  const topics = Array.from(new Set(words)).slice(0, 3);

  return {
    category: bestCategory,
    primaryCategory: bestCategory,
    surfaceTags: topics,
    deepTags: {},
    resonances,
    emotion: bestEmotion,
    people: [],
    topics,
    sentiment: 'neutral',
    urgency: low.includes('urgent') || low.includes('asap') || low.includes('important') ? 'high' : 'low',
    dates: []
  };
}

/**
 * DEEP SYNTHESIS
 * Integrates embedding anchors for dynamic tags and resonances.
 */
export async function extractDeep(text: string, embedding?: Float32Array): Promise<SemanticMetadata> {
  console.log(`[ai.ts] Deep synthesis requested`);
  
  const realtime = extractRealtime(text);
  
  // Calculate dynamic semantic resonances if we have an embedding
  let deepTags: Record<string, number> = {};
  let primaryCategory = realtime.category;
  let highestScore = 0;

  if (embedding) {
    try {
      const anchorService = SemanticAnchorService.getInstance();
      deepTags = anchorService.calculateResonances(embedding);
      
      // Determine primary category from strongest anchor resonance
      for (const [anchor, score] of Object.entries(deepTags)) {
        if (score > highestScore) {
          highestScore = score;
          primaryCategory = anchor;
        }
      }
    } catch (e) {
      console.warn('[ai.ts] Failed to calculate anchor resonances:', e);
    }
  }

  return {
    ...realtime,
    primaryCategory: highestScore > 0.6 ? primaryCategory : realtime.category,
    deepTags,
    resonances: {
      ...realtime.resonances,
      ...deepTags
    }
  };
}
