import { Note } from '@/store/useNotesStore';

export interface Person {
  id: string;
  name: string;
  initials: string;
  mentionCount: number;
  lastMentioned: number;
  noteIds: string[];
  color: string;
}

const AVATAR_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A8',
  '#33FFF3', '#F3FF33', '#FF8C33', '#8E44AD', '#2ECC71'
];

export function extractPeopleFromNotes(notes: Note[]): Person[] {
  const peopleMap = new Map<string, Person>();
  
  // Basic Name Extraction Heuristic:
  // Look for capitalized words that are not at the start of a sentence (or are common names)
  // We'll use a whitelist of common words to exclude to keep it "clean" for a demo
  const excludeWords = new Set([
    'The', 'He', 'She', 'It', 'They', 'To', 'In', 'On', 'With', 'By', 'For', 'At', 
    'From', 'As', 'My', 'Our', 'Drift', 'Map', 'Chronos', 'Nexus', 'Focus', 'Mode',
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December', 'Just', 'Feeling', 'I', 'What', 
    'Life', 'Running', 'Coffee', 'Todo', 'Idea', 'Journal', 'Need', 'Buy', 'Met'
  ]);

  const nameRegex = /\b([A-Z][a-z]+)\b/g;

  notes.forEach(note => {
    let match;
    const foundInNote = new Set<string>();
    
    while ((match = nameRegex.exec(note.content)) !== null) {
      const name = match[1];
      if (!excludeWords.has(name) && name.length > 2) {
        foundInNote.add(name);
      }
    }

    foundInNote.forEach(name => {
      if (peopleMap.has(name)) {
        const p = peopleMap.get(name)!;
        p.mentionCount += 1;
        p.noteIds.push(note.id);
        if (note.created_at > p.lastMentioned) {
          p.lastMentioned = note.created_at;
        }
      } else {
        const initials = name.substring(0, 2).toUpperCase();
        const color = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
        peopleMap.set(name, {
          id: `person-${name}`,
          name,
          initials,
          mentionCount: 1,
          lastMentioned: note.created_at,
          noteIds: [note.id],
          color
        });
      }
    });
  });

  return Array.from(peopleMap.values()).sort((a, b) => b.mentionCount - a.mentionCount);
}

export function getPeopleConnections(notes: Note[], people: Person[]): { source: string, target: string, strength: number }[] {
  const connectionMap = new Map<string, number>();
  const nameToId = new Map(people.map(p => [p.name, p.id]));

  notes.forEach(note => {
    const mentionedNames = people
      .filter(p => note.content.includes(p.name))
      .map(p => p.name);

    for (let i = 0; i < mentionedNames.length; i++) {
      for (let j = i + 1; j < mentionedNames.length; j++) {
        const pair = [mentionedNames[i], mentionedNames[j]].sort().join('<->');
        connectionMap.set(pair, (connectionMap.get(pair) || 0) + 1);
      }
    }
  });

  return Array.from(connectionMap.entries()).map(([pair, strength]) => {
    const [nameA, nameB] = pair.split('<->');
    return {
      source: nameToId.get(nameA)!,
      target: nameToId.get(nameB)!,
      strength
    };
  });
}

export function generateSeedPeopleNotes(): Note[] {
  const seedPeople = [
    { name: 'Rahul', context: 'Suggested the search reveal gesture. Always has great UI insights.' },
    { name: 'Sarah', context: 'Asked about the Android release timeline. She is excited about the kinetic Map.' },
    { name: 'Alex', context: 'Found a bug in the 3D physics engine. Need to sync with him about the drift velocity.' },
    { name: 'Maya', context: 'Designing the new icons for the People tab. Her style is pure minimalism.' },
    { name: 'Liam', context: 'Sent a link to a research paper on spatial memory and note taking.' }
  ];

  return seedPeople.map((p, i) => ({
    id: `seed-person-${i}-${Date.now()}`,
    content: `Met with ${p.name} today. ${p.context}`,
    created_at: Date.now() - (i * 86400000), // Spaced by days
    source_type: 'text',
    entities_json: JSON.stringify({ category: 'Meeting', people: [p.name] }),
  })) as Note[];
}
