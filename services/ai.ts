// Neural Bridge: Lazy-load Llama to avoid circular imports
export const getLlama = () => require('./LocalLlamaService').LocalLlamaService.getInstance();

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
  resonances?: Record<string, number>;
}

export const SEMANTIC_INTENTS: Partial<Record<NoteCategory, RegExp[]>> = {
  Todo: [/task/i, /todo/i, /buy/i, /remind/i, /finish/i, /action/i, /check/i, /urgent/i, /must/i, /checklist/i, /\[ \]/, /need to/i, /should/i, /appointment/i, /schedule/i],
  Idea: [/idea/i, /concept/i, /brainstorm/i, /maybe/i, /what if/i, /project/i, /vision/i, /bulb/i, /innov/i, /potential/i, /spark/i, /insight/i, /think/i, /thought/i, /consider/i],
  Meeting: [/meet/i, /sync/i, /huddl/i, /call/i, /agend/i, /discuss/i, /participant/i, /zoom/i, /teams/i, /skype/i, /invite/i, /calend/i, /huddle/i, /interview/i, /standup/i],
  Dream: [/dream/i, /nightm/i, /vivid/i, /vision/i, /last night/i, /slept/i, /woke up/i, /unconsc/i, /dreaming/i, /lucid/i, /astral/i, /slumber/i],
  Study: [/learn/i, /read/i, /study/i, /course/i, /lesson/i, /exam/i, /test/i, /acad/i, /grad/i, /chapter/i, /book/i, /lectur/i, /tutorial/i, /homework/i, /class/i],
  Research: [/data/i, /analy/i, /expe/i, /scien/i, /hypo/i, /evidence/i, /stats/i, /finding/i, /investig/i, /discov/i, /paper/i, /source/i, /article/i, /wiki/i],
  Quote: [/said/i, /stated/i, /mention/i, /wrote/i, /author/i, /remark/i, /"|'|“|”/, /quoted/i, /cite/i, /quote/i, /philosophy/i],
  Reflection: [/feel/i, /wonder/i, /realiz/i, /honestly/i, /insight/i, /believe/i, /gratit/i, /reflex/i, /ponder/i, /meditat/i, /journal/i, /dear diary/i, /morning/i, /evening/i, /today/i],
  Creative: [/poem/i, /lyrics/i, /story/i, /novel/i, /sketch/i, /design/i, /art/i, /doodle/i, /paint/i, /compo/i, /melody/i, /prototyp/i, /fiction/i, /script/i, /creative/i, /write/i, /draw/i]
};

export const EMOTION_MAP: Record<string, RegExp[]> = {
  'Happy': [/happy/i, /great/i, /good/i, /awesome/i, /excited/i, /love/i, /fun/i, /joy/i, /grin/i, /\:\)/, /blessed/i, /glad/i, /cheerful/i],
  'Sad': [/sad/i, /bad/i, /blue/i, /unhappy/i, /cry/i, /alone/i, /miss/i, /down/i, /\:\(/, /lonely/i, /depress/i, /sorrow/i, /hurt/i],
  'Angry': [/angry/i, /mad/i, /hate/i, /annoy/i, /frustrat/i, /piss/i, /stop/i, /ugh/i, /furious/i, /rage/i, /irritated/i],
  'Focused': [/focus/i, /work/i, /study/i, /deep/i, /concentrat/i, /flow/i, /product/i, /grind/i, /hustle/i, /busy/i],
  'Curious': [/wonder/i, /why/i, /how/i, /curious/i, /ask/i, /question/i, /mystery/i, /ponder/i, /seek/i, /explore/i],
  'Inspired': [/wow/i, /inspirational/i, /bright/i, /light/i, /spark/i, /new/i, /amazing/i, /eureka/i, /vision/i, /motivated/i]
};

/**
 * PRELIMINARY INTENT PREDICTION (100% Local Heuristics)
 * Used only for real-time UI feedback during capture.
 * DO NOT use this for final database categorization.
 */
export async function predictIntent(text: string): Promise<{ category: NoteCategory; emotion: string; resonances: Record<string, number> } | null> {
  const low = text.toLowerCase();
  if (!low.trim()) return { category: 'Journal', emotion: 'Neutral', resonances: { Journal: 1.0 } };

  let bestCategory: NoteCategory = 'Journal';
  let highestScore = 0;
  const resonances: Record<string, number> = {};
  const rawScores: Record<string, number> = {};
  let totalScore = 0;

  for (const [cat, patterns] of Object.entries(SEMANTIC_INTENTS)) {
    let score = 0;
    patterns.forEach(pattern => {
      const matches = low.match(pattern);
      if (matches) score += matches.length;
    });
    
    rawScores[cat] = score;
    totalScore += score;

    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat as NoteCategory;
    }
  }

  // Normalize scores into resonances (0.0 to 1.0)
  // If no patterns match, Journal gets 1.0
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

  console.log(`[ShadowEngine] Analyzing: "${text.substring(0, 50)}..."`);
  console.log(`[ShadowEngine] Predicted -> ${bestCategory} | ${bestEmotion}`);
  
  return { category: bestCategory, emotion: bestEmotion, resonances };
}

/**
 * DEEP SYNTHESIS (Future Local Llama-based background task)
 */
export async function extractDeep(text: string): Promise<ExtractedEntities | null> {
  console.log(`[ShadowEngine] Deep synthesis requested`);
  
  // Currently falls back to real-time local logic to preserve offline status
  const basic = await predictIntent(text);
  
  console.log(`[ShadowEngine] Deep classification complete: ${basic?.category}`);
  return {
    category: basic?.category || 'Journal',
    emotion: basic?.emotion || 'Neutral',
    resonances: basic?.resonances || { Journal: 1.0 },
    people: [],
    topics: [],
    sentiment: 'neutral',
    urgency: 'low',
    dates: []
  };
}
