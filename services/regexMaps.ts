export const SEMANTIC_INTENTS: Record<string, RegExp[]> = {
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
