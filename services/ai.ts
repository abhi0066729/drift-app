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

export const SEMANTIC_INTENTS: Partial<Record<NoteCategory, RegExp[]>> = {
  Todo: [/task/i, /todo/i, /buy/i, /remind/i, /finish/i, /action/i, /check/i, /urgent/i, /must/i, /checklist/i, /\[ \]/, /need to/i, /should/i],
  Idea: [/idea/i, /concept/i, /brainstorm/i, /maybe/i, /what if/i, /project/i, /vision/i, /bulb/i, /innov/i, /potential/i, /spark/i, /insight/i],
  Meeting: [/meet/i, /sync/i, /huddl/i, /call/i, /agend/i, /discuss/i, /participant/i, /zoom/i, /teams/i, /skype/i, /invite/i, /calend/i, /huddle/i, /interview/i],
  Dream: [/dream/i, /nightm/i, /vivid/i, /vision/i, /last night/i, /slept/i, /woke up/i, /unconsc/i, /dreaming/i, /lucid/i],
  Study: [/learn/i, /read/i, /study/i, /course/i, /lesson/i, /exam/i, /test/i, /acad/i, /grad/i, /chapter/i, /book/i, /lectur/i, /tutorial/i],
  Research: [/data/i, /analy/i, /expe/i, /scien/i, /hypo/i, /evidence/i, /stats/i, /finding/i, /investig/i, /discov/i, /paper/i, /source/i],
  Quote: [/said/i, /stated/i, /mention/i, /wrote/i, /author/i, /remark/i, /"|'|“|”/, /quoted/i, /cite/i],
  Reflection: [/think/i, /feel/i, /wonder/i, /realiz/i, /honestly/i, /insight/i, /thought/i, /believe/i, /gratit/i, /reflex/i, /ponder/i, /meditat/i, /journal/i, /dear diary/i],
  Creative: [/poem/i, /lyrics/i, /story/i, /novel/i, /sketch/i, /design/i, /art/i, /doodle/i, /paint/i, /compo/i, /melody/i, /prototyp/i, /fiction/i, /script/i]
};

export const EMOTION_MAP: Record<string, RegExp[]> = {
  'Happy': [/happy/i, /great/i, /good/i, /awesome/i, /excited/i, /love/i, /fun/i, /joy/i, /grin/i, /\:\)/],
  'Sad': [/sad/i, /bad/i, /blue/i, /unhappy/i, /cry/i, /alone/i, /miss/i, /down/i, /\:\(/],
  'Angry': [/angry/i, /mad/i, /hate/i, /annoy/i, /frustrat/i, /piss/i, /stop/i, /ugh/i],
  'Focused': [/focus/i, /work/i, /study/i, /deep/i, /concentrat/i, /flow/i, /product/i],
  'Curious': [/wonder/i, /why/i, /how/i, /curious/i, /ask/i, /question/i, /mystery/i],
  'Inspired': [/wow/i, /inspirational/i, /bright/i, /light/i, /spark/i, /new/i, /amazing/i]
};

/**
 * FAST PREDICTION (100% Local Heuristics)
 */
export async function extractRealtime(text: string): Promise<{ category: NoteCategory; emotion: string } | null> {
  const low = text.toLowerCase();
  if (!low.trim()) return { category: 'Journal', emotion: 'Neutral' };

  let bestCategory: NoteCategory = 'Journal';
  let highestScore = 0;

  for (const [cat, patterns] of Object.entries(SEMANTIC_INTENTS)) {
    let score = 0;
    patterns.forEach(pattern => {
      const matches = low.match(pattern);
      if (matches) score += matches.length;
    });
    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat as NoteCategory;
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

  return { category: bestCategory, emotion: bestEmotion };
}

/**
 * DEEP SYNTHESIS (Future Local Llama-based background task)
 */
export async function extractDeep(text: string): Promise<ExtractedEntities | null> {
  // Currently falls back to real-time local logic to preserve offline status
  const basic = await extractRealtime(text);
  return {
    category: basic?.category || 'Journal',
    emotion: basic?.emotion || 'Neutral',
    people: [],
    topics: [],
    sentiment: 'neutral',
    urgency: 'low',
    dates: []
  };
}
