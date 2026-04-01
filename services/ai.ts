const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const MODEL_FAST = 'nvidia/nemotron-3-super-120b-a12b:free';
const MODEL_DEEP = 'nvidia/nemotron-3-super-120b-a12b:free';

export type NoteCategory = 
  | 'Journal' 
  | 'Study' 
  | 'Idea' 
  | 'Todo' 
  | 'Dream' 
  | 'Research' 
  | 'Quote' 
  | 'Meeting' 
  | 'Reflection' 
  | 'Creative';

export interface ExtractedEntities {
  category: NoteCategory;
  emotion: string;
  people: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency: 'high' | 'medium' | 'low';
  dates: string[];
}

/**
 * Utility to scrub markdown and extra text from JSON response
 */
function scrubJSON(text: string): string | null {
  if (!text) return null;
  let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return clean.substring(start, end + 1);
}

/**
 * FAST PREDICTION (Real-time hints)
 */
export async function extractRealtime(text: string): Promise<{ category: NoteCategory; emotion: string } | null> {
  if (!API_KEY || !text.trim()) return null;

  const validCategories: NoteCategory[] = ['Journal','Study','Idea','Todo','Dream','Research','Quote','Meeting','Reflection','Creative'];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_FAST,
        messages: [
          { 
            role: 'system', 
            content: `Respond with ONLY JSON. Pick ONE: Journal, Study, Idea, Todo, Dream, Research, Quote, Meeting, Reflection, Creative.
Example: "Buy milk" -> {"category": "Todo", "emotion": "Neutral"}`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 60,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    console.log('[AI Realtime Raw]:', rawContent);

    const scrubbed = scrubJSON(rawContent);
    if (!scrubbed) return null;
    const parsed = JSON.parse(scrubbed);
    if (parsed.category && validCategories.includes(parsed.category)) {
      return parsed;
    }
  } catch (e) {
    console.warn('[AI Realtime] Parse failed:', e);
  }
  return null;
}

/**
 * DEEP SYNTHESIS (Background enrichment)
 */
export async function extractDeep(text: string): Promise<ExtractedEntities | null> {
  if (!API_KEY) return null;

  const validCategories: NoteCategory[] = ['Journal','Study','Idea','Todo','Dream','Research','Quote','Meeting','Reflection','Creative'];

  const systemPrompt = `Analyze this note. Return ONLY valid JSON.
Pick ONE: Journal, Study, Idea, Todo, Dream, Research, Quote, Meeting, Reflection, Creative.
JSON: {"category": "...", "emotion": "...", "people": [], "topics": [], "sentiment": "neutral", "urgency": "medium", "dates": []}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_DEEP,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    console.log('[AI Deep Raw]:', rawContent);

    const scrubbed = scrubJSON(rawContent);
    if (!scrubbed) return null;
    const parsed = JSON.parse(scrubbed);
    if (parsed.category && validCategories.includes(parsed.category)) {
      return parsed;
    }
  } catch (e) {
    console.error('[AI Deep] Parse failed:', e);
  }
  return null;
}
