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
function scrubJSON(text: string): string {
  // Remove markdown code blocks if present
  let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  // Find the first { and the last }
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }
  return clean;
}

/**
 * FAST PREDICTION (Llama 3.2 3B)
 * Used for real-time UI hints while typing.
 */
export async function extractRealtime(text: string): Promise<{ category: NoteCategory; emotion: string } | null> {
  if (!API_KEY || !text.trim()) return null;

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
            content: `Return JSON ONLY. 
Categories: Journal, Study, Idea, Todo, Dream, Research, Quote, Meeting, Reflection, Creative.

Example 1: "Need to buy milk" -> {"category": "Todo", "emotion": "Neutral"}
Example 2: "Saw a whale flying" -> {"category": "Dream", "emotion": "Surprise"}
Example 3: "Calculus is hard" -> {"category": "Study", "emotion": "Frustration"}`
          },
          { role: 'user', content: text }
        ],
        response_format: { type: "json_object" },
        max_tokens: 60,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const content = scrubJSON(data.choices[0].message.content);
    return JSON.parse(content);
  } catch (e) {
    console.warn('Realtime AI Parse Error:', e);
    return null;
  }
}

/**
 * DEEP SYNTHESIS (Llama 3.3 70B)
 * Used for background enrichment after save.
 */
export async function extractDeep(text: string): Promise<ExtractedEntities | null> {
  if (!API_KEY) return null;

  const systemPrompt = `
Analyze this note for the Drift app. Return JSON ONLY.
Categories: Journal, Study, Idea, Todo, Dream, Research, Quote, Meeting, Reflection, Creative.

Example: "Meeting with Bob tomorrow about the project" -> {
  "category": "Meeting",
  "emotion": "Professional",
  "people": ["Bob"],
  "topics": ["project"],
  "sentiment": "neutral",
  "urgency": "medium",
  "dates": ["tomorrow"]
}
`;

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
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    const content = scrubJSON(data.choices[0].message.content);
    return JSON.parse(content);
  } catch (e) {
    console.error('Deep extraction error:', e);
    return null;
  }
}
