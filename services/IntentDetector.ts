import { NoteCategory } from './ai';

export type RetrievalIntent = 
  | 'LOOKUP'     // "find the note about X"
  | 'EXPLORE'    // "what have I been thinking about"
  | 'SYNTHESISE' // "tell me about Y"
  | 'CONNECT'    // "how does this relate"
  | 'RECALL'     // "from last year"
  | 'SURFACE';   // system-driven discovery

export interface DetectedIntent {
  intent: RetrievalIntent;
  query: string;
  filters: {
    category?: NoteCategory;
    timeRange?: { start: number; end: number };
    entities?: string[];
  };
  confidence: number;
}

export class IntentDetector {
  /**
   * Heuristic Intent Detection Engine
   * upgradeable to Llama 3.2 1B in Phase 3
   */
  public static detect(query: string): DetectedIntent {
    const q = query.toLowerCase().trim();
    
    // 1. RECALL (Temporal indicators)
    if (q.includes('last year') || q.includes('month') || q.includes('ago') || q.includes('202')) {
      return {
        intent: 'RECALL',
        query: q.replace(/last year|month|ago|202\d/g, '').trim(),
        filters: { /* TODO: parse dates */ },
        confidence: 0.9
      };
    }

    // 2. SYNTHESISE (Reasoning indicators)
    if (q.startsWith('what do i know') || q.startsWith('summarise') || q.startsWith('tell me about')) {
      return {
        intent: 'SYNTHESISE',
        query: q.replace(/what do i know|summarise|tell me about/g, '').trim(),
        filters: {},
        confidence: 0.85
      };
    }

    // 3. EXPLORE (Vague/Thematic indicators)
    if (q.length < 5 || q.includes('thinking about') || q.includes('ideas')) {
      return {
        intent: 'EXPLORE',
        query: q,
        filters: {},
        confidence: 0.7
      };
    }

    // 4. LOOKUP (Specific keywords/Short queries)
    // Default for everything else
    return {
      intent: 'LOOKUP',
      query: q,
      filters: {},
      confidence: 0.6
    };
  }
}
