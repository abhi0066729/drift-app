import { Note } from '@/store/useNotesStore';

export function generateFullGhostPool(limit: number = 5): Note[] {
  // Ordered by narrative priority: Welcome -> Core UI -> Navigation -> AI/Advanced
  const pool = [
    { id: 'ghost-1', category: 'Welcome to Drift', content: "Welcome to Drift. Just type to capture your thoughts. Drift's engine handles live categorization automatically in the background.", img: null },
    { id: 'ghost-2', category: 'Timeline Filters', content: "Tap the Chronos or Nexus toggles at the top of the map to instantly switch your view. Chronos organizes by date, and Nexus organizes by contextual priority.", img: 'chronos_nexus_toggle.gif' },
    { id: 'ghost-3', category: 'Focus Mode', content: "Tap any pulsing node to dive into Focus Mode. The application will instantly isolate the active thread so you can read related notes smoothly.", img: null },
    { id: 'ghost-7', category: 'Quick Navigation', content: "Use the bottom navigation bar to rapidly jump between the Home Map, the Capture Lens, and the detailed Notes List view.", img: 'bottom_tab_physics.gif' },
    { id: 'ghost-4', category: 'Rich Media', content: "The fast-capture lens is below. You can drop rich photos directly into your thoughts, and the system will attach them to your ideas.", img: 'capture_flow.gif' },
  ];

  // Map to full Note objects with decreasing timestamps (recent first)
  return pool.slice(0, limit).map((item, idx) => ({
    id: item.id,
    content: item.content,
    created_at: Date.now() - (idx * 600000), 
    source_type: 'text',
    images: item.img ? [item.img] : [],
    entities_json: JSON.stringify({ category: item.category }),
    is_ghost: true,
  })) as Note[];
}

export function generateMockUserNotes(): Note[] {
  const thoughts = [
    { category: 'Journal', content: "Just woke up. The sky is incredibly clear today. I should probably focus on finishing the UI timeline animations before noon." },
    { category: 'Idea', content: "App idea: A kinetic clock that changes its typography weight based on how fast you are physically moving." },
    { category: 'Todo', content: "Buy oat milk and coffee beans." },
    { category: 'Journal', content: "Feeling exhausted. The math behind the 3D physics engine is finally clicking though. Just need to rest." },
    { category: 'Study', content: "Reading Essentialism. The core thesis is simple: Almost everything is noise. We need to fiercely protect our focus." },
  ];

  return thoughts.map((item, idx) => ({
    id: `mock-user-${idx}`,
    content: item.content,
    created_at: Date.now() - (idx * 3600000), 
    source_type: 'text',
    images: [],
    entities_json: JSON.stringify({ category: item.category }),
    is_ghost: false,
  })) as Note[];
}

export function processContextualConnections(notes: Note[], width: number, searchQuery: string = '') {
  const clusterCounts: Record<number, number> = {};
  const isSearchActive = searchQuery.trim() !== '';
  
  let currentMatchY = 240;
  let currentDimY = 0;
  let runningY = 240; // High-priority origin: absolute top of the map

  // First pass: Pre-calculate match status for sorting
  const notesWithStatus = notes.map(n => ({
    ...n,
    searchStatus: calculateSearchMatch(searchQuery, n)
  }));

  const matchCount = notesWithStatus.filter(n => n.searchStatus === 'match').length;
  currentDimY = 300 + (matchCount * 220) + 400; 

  const processedNotes = notesWithStatus.map((note, i) => {
    let category = 'Journal';
    let clusterId = -1;
    let resonances: Record<string, number> = {};
    if (note.entities_json) {
      try {
        const parsed = JSON.parse(note.entities_json);
        category = parsed.category || parsed.categories?.[0] || 'Journal';
        clusterId = parsed.clusterId ?? -1;
        resonances = parsed.resonances || { [category]: 1.0 };
      } catch (e) { }
    } else {
      resonances = { [category]: 1.0 };
    }

    const localIndex = clusterCounts[clusterId] || 0;
    if (clusterId !== -1) clusterCounts[clusterId] = localIndex + 1;

    // --- SHARED SERPENTINE LOGIC ---
    // Inclusion of category ensures that changing the category physically shifts the node's Lane
    const getStableHash = (id: string, cat: string) => {
      const seed = id + cat;
      let hash = 0;
      for (let charIdx = 0; charIdx < seed.length; charIdx++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(charIdx);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const nodeHash = getStableHash(note.id, category);
    const randX = (nodeHash % 1000) / 1000;
    const randY = ((nodeHash >> 3) % 1000) / 1000;
    
    // --- SHARED SERPENTINE LOGIC ---
    // Use hash for stable side assignment
    const isRight = note.is_ghost ? (i % 2 !== 0) : (nodeHash % 5 <= 2);
    
    const basePadding = 50; // Increased padding slightly
    const varianceX = note.is_ghost ? (randX * 60) : (randX * 130);
    const unfocusedX = isRight ? (width - basePadding - varianceX) : (basePadding + varianceX);
    
    // Pin Y to a more stable runningY, reduce variance noise to 0 to ensure centering
    const resY = isSearchActive 
      ? (note.searchStatus === 'match' ? currentMatchY : currentDimY + (i * 150))
      : runningY;

    // Increment Y for the next note
    if (isSearchActive && note.searchStatus === 'match') {
      currentMatchY += (note.is_ghost ? 220 : 250);
    }
    
    // Physical Spacing: Generous gaps to prevent visual overlap
    runningY += (note.is_ghost ? 380 : 420); 

    const textTargetWidth = width * 0.52;
    const PADDING = 65;
    const margin = 20;
    const rightSpace = width - unfocusedX - PADDING - margin;
    const leftSpace = unfocusedX - PADDING - margin;
    const available = isRight ? leftSpace : rightSpace;
    const dynamicWidth = Math.max(140, Math.min(textTargetWidth, available));
    const unfocusedTextLeft = isRight ? unfocusedX - dynamicWidth - PADDING : unfocusedX + PADDING;

    const ageFade = note.is_ghost ? 0.8 : Math.max(0.4, 1 - (i * 0.015)); // High opacity floor
    const importance = note.is_ghost ? 1 : Math.min(1, note.content.length / 85);
    const nodeRadius = note.is_ghost ? 6 : 5 + (importance * 5.5);
    const isGlowing = note.is_ghost || importance >= 0.8;
    const displayLines = note.is_ghost ? 3 : Math.floor(randX * 4) + 2;

    return {
      ...note,
      isRight,
      unfocusedX,
      unfocusedY: resY,
      unfocusedTextLeft,
      dynamicWidth,
      nodeRadius,
      ageFade,
      importance,
      isGlowing,
      category,
      categories: [category],
      resonances,
      clusterId,
      clusterIndex: localIndex,
      displayLines,
      connectedNodeId: null as string | null,
      connectedNodeIndex: null as number | null,
      connections: [] as { targetId: string, category: string, weight: number }[],
    };
  });

  // Second Pass: O(N) Multi-Category Connections
  const lastSeenByCategory = new Map<string, number>();
  for (let i = processedNotes.length - 1; i >= 0; i--) {
    const note = processedNotes[i];
    
    const connections: { targetId: string, category: string, weight: number }[] = [];
    
    // Connect back sequentially for every active resonance
    Object.entries(note.resonances).forEach(([cat, weight]) => {
      const targetIdx = lastSeenByCategory.get(cat);
      if (targetIdx !== undefined) {
         connections.push({ targetId: processedNotes[targetIdx].id, category: cat, weight: weight as number });
      }
      lastSeenByCategory.set(cat, i);
    });

    note.connections = connections;
    // Maintain backwards compatibility for single node tracking if needed elsewhere
    note.connectedNodeId = connections.length > 0 ? connections[0].targetId : null;
    note.connectedNodeIndex = connections.length > 0 ? processedNotes.findIndex(n => n.id === connections[0].targetId) : null;
  }

  return processedNotes;
}

export function calculateSearchMatch(query: string, note: any): 'match' | 'dim' | 'none' {
  if (!query || query.trim() === '') return 'none';
  
  const q = query.toLowerCase().trim();
  const content = note.content.toLowerCase();
  const category = (note.category || '').toLowerCase();

  // 1. Literal Match (Highest priority)
  if (content.includes(q) || category.includes(q)) return 'match';

  // 2. Semantic Category Mapping (The 'Thought' Search)
  const semanticMaps: Record<string, string[]> = {
    'journal': ['anxious', 'feeling', 'tired', 'happy', 'exhausted', 'woke up', 'mood'],
    'todo': ['buy', 'call', 'fix', 'email', 'task', 'do', 'need to'],
    'idea': ['app', 'what if', 'concept', 'innovation', 'maybe'],
    'study': ['reading', 'learned', 'notes', 'theory', 'book']
  };

  for (const [cat, keywords] of Object.entries(semanticMaps)) {
    if (category === cat && keywords.some(k => q.includes(k) || k.includes(q))) {
      return 'match';
    }
  }

  // 3. Temporal Matches (Mocked for now since created_at is relative)
  if (q.includes('last week') || q.includes('yesterday') || q.includes('recent')) {
    const ageDays = (Date.now() - note.created_at) / (1000 * 60 * 60 * 24);
    if (q.includes('recent') && ageDays < 2) return 'match';
    if (q.includes('yesterday') && ageDays >= 1 && ageDays < 2) return 'match';
    if (q.includes('last week') && ageDays < 7) return 'match';
  }

  // 4. People Layer (Mocked heuristic)
  if (q === 'rahul' || q === 'sarah') {
    if (content.includes(q)) return 'match';
  }

  return 'dim';
}
