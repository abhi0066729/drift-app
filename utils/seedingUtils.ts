import { Note } from '@/store/useNotesStore';
import * as Crypto from 'expo-crypto';

interface SeedThought {
  content: string;
  category: string;
}

export const seedSyntheticMemories = (addNote: (note: Note) => void, notes: Note[]) => {
  if (notes.length > 5) return; // Don't double-seed if they already have plenty of notes

  const historicalThoughts: SeedThought[] = [
    { content: "Exploring the fluid dynamics of liquid design in mobile apps. The way buttons breathe and react to touch.", category: 'Creative' },
    { content: "Need to research SQLite FTS5 for local full-text search optimization.", category: 'Study' },
    { content: "Journal: Feeling focused today. The drift app is coming together. The sentient logic feels right.", category: 'Journal' },
    { content: "Todo: Finalize the Pattern Pulse animations in the Nexus Matrix.", category: 'Todo' },
    { content: "Idea: What if notes could vibrate with your heartbeat? Bio-kinetic resonance.", category: 'Idea' },
    { content: "Meeting notes: Discussed the AI whispers strategy. User wants it non-intrusive but helpful.", category: 'Meeting' },
    { content: "Reflection: Why do I work better at night? The silence has a different frequency.", category: 'Reflection' },
    { content: "Dream: Floating in a purple nebula where thoughts were literally stars you could grab.", category: 'Dream' },
    { content: "Research: Semantic overlap heuristics are faster than LLM calls for simple echoes.", category: 'Research' },
    { content: "Creative: High-fidelity particle systems create a sense of digital soul.", category: 'Creative' },
  ];

  historicalThoughts.forEach((thought, i) => {
    const id = Crypto.randomUUID();
    const created_at = Date.now() - (i + 1) * 2 * 3600000; // Spread over last 20 hours
    
    addNote({
      id,
      content: thought.content,
      created_at,
      source_type: 'text',
      images: [],
      entities_json: JSON.stringify({ category: thought.category, emotion: 'Focused' }),
    } as Note);
  });
};
