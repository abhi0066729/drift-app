const API_KEY = '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';
const MODEL_FAST = 'meta-llama/llama-3.2-3b-instruct:free';

async function testFast() {
  console.log('Testing Llama 3B...');
  try {
    const fetch = require('node-fetch');
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
          { role: 'user', content: "I need to buy" }
        ],
        response_format: { type: "json_object" },
        max_tokens: 60,
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    console.log('RAW RESPONSE:');
    console.log(JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      console.log('RAW CONTENT:\n' + content);

      let clean = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        clean = clean.substring(start, end + 1);
      }
      console.log('CLEANED CONTENT:\n' + clean);
    }

  } catch (e) {
    console.error('Test Failed:', e);
  }
}

testFast();
