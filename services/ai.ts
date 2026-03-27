const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_OPENROUTER_MODEL || 'zhipu/glm-4';

export interface ExtractedEntities {
  people: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency: 'high' | 'medium' | 'low';
  dates: string[];
}

export async function extractEntities(noteContent: string): Promise<ExtractedEntities | null> {
  if (!API_KEY) {
    console.warn('OpenRouter API Key not configured.');
    return null;
  }

  const systemPrompt = `
You are the intelligence layer of the Drift app. 
Analyze the following user note and extract entities as structured JSON. 
Extract: 
1. "people": array of names mentioned.
2. "topics": array of 1-3 word topic tags.
3. "sentiment": positive, neutral, negative, or mixed.
4. "urgency": high, medium, or low based on deadlines or emotional tone.
5. "dates": array of any referenced dates or relative dates (e.g. "tomorrow").

Constraints:
- Respond ONLY with valid JSON matching this structure. Do not wrap in markdown blocks.
- If a field is empty, return an empty array.
`;

  // Use mock AI data for now to save API credits
  const useMock = true;

  if (useMock) {
    console.log('Using mocked AI data for:', noteContent);
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      people: ['Priya', 'Rahul'],
      topics: ['project planning', 'blocker'],
      sentiment: noteContent.toLowerCase().includes('good') ? 'positive' : 'neutral',
      urgency: noteContent.toLowerCase().includes('need') ? 'high' : 'medium',
      dates: ['tomorrow']
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: noteContent }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content) as ExtractedEntities;
    
    return parsed;
  } catch (error) {
    console.error('Extraction error:', error);
    return null;
  }
}
