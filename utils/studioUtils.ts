import { Note } from '@/store/useNotesStore';

export interface BranchNode {
  seedNote: Note;
  connectedNotes: Note[];
}

const STOP_WORDS = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'it', 'this', 'that', 'i', 'you']);

function getKeywords(text: string): string[] {
  if (!text) return [];
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
}

function calculateSemanticResonance(seed: Note, target: Note): number {
  let score = 0;

  let seedCategory = '';
  let targetCategory = '';
  try {
    if (seed.entities_json) seedCategory = JSON.parse(seed.entities_json).category || '';
    if (target.entities_json) targetCategory = JSON.parse(target.entities_json).category || '';
  } catch (e) {}

  if (seedCategory && seedCategory === targetCategory) score += 2;

  const seedWords = getKeywords(seed.content);
  const targetWords = getKeywords(target.content);
  
  const overlaps = seedWords.filter(w => targetWords.includes(w));
  score += overlaps.length * 1.5;

  return score;
}

export function growKnowledgeTree(allNotes: Note[], seedIds: string[]): BranchNode[] {
  if (!seedIds || seedIds.length === 0 || allNotes.length === 0) return [];

  const seeds = allNotes.filter(n => seedIds.includes(n.id));
  const availableNotes = allNotes.filter(n => !seedIds.includes(n.id) && !n.is_refining);

  const branches: BranchNode[] = seeds.map(seed => {
    // If the seed itself is still being refined, don't try to grow a tree yet
    if (seed.is_refining) {
      return {
        seedNote: seed,
        connectedNotes: []
      };
    }

    const scoredNotes = availableNotes.map(n => ({
      note: n,
      score: calculateSemanticResonance(seed, n)
    }));

    const connected = scoredNotes
      .filter(sn => sn.score > 0)
      .sort((a, b) => b.score - a.score || b.note.created_at - a.note.created_at)
      .slice(0, 20) // Uncapped to 20 for stress testing
      .map(sn => sn.note);

    return {
      seedNote: seed,
      connectedNotes: connected
    };
  });

  return branches;
}
