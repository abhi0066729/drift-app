import { Note } from '@/store/useNotesStore';
export type { Note };
import { CATEGORY_COLORS } from '@/constants/Categories';

export interface NebulaHubData {
  id: string;
  x: number;
  y: number;
  title: string;
  color: string;
  summary?: string;
  notes: any[];
  satellites: Array<{ x: number, y: number, isBridge?: boolean }>;
  narrative?: Array<{ icon: string, label: string }>;
  insight?: string;
}

export interface ThoughtChainEntry {
  id: string;
  date: string;
  snippet: string;
  category: string;
  fullNote: any;
}

export interface NexusMatrixData {
  clusters: Array<{
    id: string;
    topic: string;
    count: number;
    color: string;
    notes: any[];
  }>;
  flashes: Array<{
    id: string;
    topic: string;
    title: string;
    body: string;
    count: number;
    days: number;
    color: string;
    isSignal?: boolean;
  }>;
  moodTimeline: Array<{ emotion: string, color: string }>;
}

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
    { category: 'Idea', content: "What if the note-taking app could sense your pulse and offer 'calm' categories when you are stressed?" },
    { category: 'Study', content: "Reading the React Native documentation on high-performance SVG rendering. Interesting stuff about hardware acceleration." },
    { category: 'Todo', content: "Schedule the intelligence sync for tomorrow." },
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

    // --- NEXUS: SEMANTIC DRIFT (X-Axis) ---
    // Instead of random X, we project toward category-specific semantic lanes
    const categoryLanes: Record<string, number> = {
        'Journal': 0.15,
        'Idea': 0.85,
        'Todo': 0.35,
        'Study': 0.65,
        'Research': 0.55,
        'Creative': 0.75,
        'Reflection': 0.25,
        'Dream': 0.45
    };
    const targetNexusPct = categoryLanes[category] || 0.5;
    const nexusX = 60 + (targetNexusPct * (width - 120)) + (randX * 40 - 20);

    return {
      ...note,
      isRight,
      unfocusedX,
      nexusX, // The "Meaning" X coordinate
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

/**
 * Nexus 6.0: Celestial Hub Engine
 * Calculatively selects "Major Topics" based on discussion density 
 * and generates spatial portals for topic-centric clustering.
 */
export function calculateCelestialHubs(processedNotes: any[], width: number) {
    const counts: Record<string, number> = {};
    const nodesByCategory: Record<string, any[]> = {};
    
    // 1. Density Scan
    processedNotes.forEach(node => {
        const cat = node.category || 'Reflections';
        counts[cat] = (counts[cat] || 0) + 1;
        if (!nodesByCategory[cat]) nodesByCategory[cat] = [];
        nodesByCategory[cat].push(node);
    });

    // 2. Rank Topics: Lowered threshold to 1 so the screen is never blank!
    const rankedCategories = Object.entries(counts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 4)
        .map(entry => entry[0]);

    if (rankedCategories.length === 0) return { hubs: [], hubIds: new Set<string>(), coordMap: {} };

    const hubs: any[] = [];
    const hubIds = new Set<string>();
    const coordMap: Record<string, { x: number, y: number }> = {};

    rankedCategories.forEach((cat, index) => {
        const nodes = nodesByCategory[cat];
        const count = nodes.length;
        
        const laneWidth = width / (rankedCategories.length + 1);
        const centerX = (index + 1) * laneWidth;
        
        const sortedY = [...nodes].sort((a, b) => a.unfocusedY - b.unfocusedY);
        const centerY = sortedY[Math.floor(count / 2)].unfocusedY;

        nodes.forEach((n, idx) => {
            hubIds.add(n.id);
            const stackOffset = (idx - Math.floor(count / 2)) * 90;
            coordMap[n.id] = {
                x: centerX + (Math.sin(idx * 0.5) * 20),
                y: centerY + stackOffset
            };
        });

        hubs.push({
            id: `hub-${cat}`,
            category: cat,
            title: cat.toUpperCase(),
            count,
            center: { x: centerX, y: centerY },
            color: CATEGORY_COLORS[cat] || '#8E44AD',
            nodes: nodes.map(n => ({ id: n.id })),
            bounds: {
                minX: centerX - 60,
                maxX: centerX + 60,
                minY: centerY - (count * 45),
                maxY: centerY + (count * 45)
            }
        });
    });

    return { hubs, hubIds, coordMap };
}

function createHullDescriptor(category: string, nodes: any[]) {
    const minX = Math.min(...nodes.map(n => n.nexusX));
    const maxX = Math.max(...nodes.map(n => n.nexusX));
    const minY = Math.min(...nodes.map(n => n.unfocusedY));
    const maxY = Math.max(...nodes.map(n => n.unfocusedY));

    return {
        id: `hull-${category}-${minY}`,
        category,
        nodes: nodes.map(n => ({ x: n.nexusX, y: n.unfocusedY, r: n.nodeRadius })),
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        bounds: { minX, maxX, minY, maxY }
    };
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

/**
 * Nexus 9.0: The Drift Pulse
 * Analyzes note patterns from the last 48 hours to create a soulful mental observation.
 */
export function generateMentalPattern(notes: any[]): string {
  if (notes.length === 0) return "your mind is quiet... waiting for the first spark";
  
  const now = Date.now();
  const recentNotes = notes.filter(n => (now - n.created_at) < (48 * 60 * 60 * 1000));
  
  if (recentNotes.length < 3) return "you're just beginning to drift into a new rhythm";

  const categories = recentNotes.map(n => n.category);
  const catCounts: Record<string, number> = {};
  categories.forEach(c => catCounts[c] = (catCounts[c] || 0) + 1);
  
  const dominant = Object.entries(catCounts).sort((a,b) => b[1]-a[1])[0];
  const totalFocus = dominant[1] / recentNotes.length;

  if (totalFocus > 0.6) return `you've been unusually focused on ${dominant[0].toLowerCase()} this week`;
  if (recentNotes.length > 8) return "your mind has been building toward something significant";
  if (Object.keys(catCounts).length > 5) return `today feels scattered — ${Object.keys(catCounts).length} topics, no clear centre`;
  
  return "something is unresolved — you keep circling it";
}

/**
 * Nexus 9.0: The Echo Chain
 * Finds the actual chain of thoughts that created or relate to a specific insight.
 */
export function findThoughtChain(activeNote: any, allNotes: any[]): ThoughtChainEntry[] {
  // Find notes in the same category or explicitly linked
  const chain = allNotes
    .filter(n => n.id !== activeNote.id && n.category === activeNote.category)
    .sort((a,b) => a.created_at - b.created_at)
    .slice(-4) // Show the last 4 leading up to this
    .map(n => ({
      id: n.id,
      date: new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      snippet: n.content.substring(0, 45) + (n.content.length > 45 ? '...' : ''),
      category: n.category,
      fullNote: n
    }));
    
  return chain;
}

/**
 * Nexus 10.0: The Mirror Matrix Data Engine
 * Compiles all notes into Surface Cards, Cluster Cards, and Mood Threads.
 */
export function generateNexusMatrix(allNotes: any[]): NexusMatrixData {
  const clusters: any[] = [];
  const flashes: any[] = [];
  const moodTimeline: any[] = [];
  
  // 1. Group by Topic (Mocked for now using Category)
  const grouped: Record<string, any[]> = {};
  allNotes.forEach(n => {
    const cat = n.category || 'Journal';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(n);
  });

  Object.entries(grouped).slice(0, 4).forEach(([cat, notes]) => {
    clusters.push({
      id: `cluster-${cat}`,
      topic: cat,
      count: notes.length,
      color: CATEGORY_COLORS[cat] || '#8E44AD',
      notes: notes.slice(0, 3) // Show top 3 snippets
    });

    if (notes.length >= 3) {
      flashes.push({
        id: `flash-${cat}`,
        topic: cat,
        title: `You've circled this ${notes.length} times`,
        body: `Across ${notes.length} separate notes, your thinking keeps returning to ${cat.toLowerCase()}. The pattern suggests this is building into something significant.`,
        count: notes.length,
        days: 6, // Mocked timeframe
        color: CATEGORY_COLORS[cat] || '#7c3aed'
      });
    }
  });

  // 2. Generate Mood Timeline (Last 8 notes today)
  allNotes.slice(0, 8).forEach(n => {
    const emotion = n.emotion || 'neutral';
    moodTimeline.push({
      emotion,
      color: CATEGORY_COLORS[n.category] || '#2e2e2e'
    });
  });

  return { clusters, flashes, moodTimeline };
}

/**
 * Nexus 12.0: The Resonance Engine
 * Lightweight keyword-overlap utility for Zero-Latency 'Memory Echoes'.
 */
export function calculateResonanceScore(text: string, reference: string): number {
  if (!text || !reference) return 0;
  const t = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const r = reference.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (t.length === 0) return 0;
  
  const matches = t.filter(word => r.includes(word));
  return matches.length / Math.max(t.length, 1);
}

export function findResonantNote(text: string, notes: Note[]): Note | null {
  if (text.length < 15) return null; // Wait for a short sentence fragment
  let bestMatch: Note | null = null;
  let highestScore = 0;

  for (const note of notes) {
    if (note.is_ghost) continue;
    const score = calculateResonanceScore(text, note.content);
    if (score > highestScore && score > 0.6) { // 60% keyword overlap threshold
      highestScore = score;
      bestMatch = note;
    }
  }

  return bestMatch;
}

/**
 * Nexus 12.0: The Habit Insight Engine
 * Generates soulful-clinical hybrid observations based on note patterns.
 */
export function generateSmartInsight(category: string, notes: Note[]): string {
  const catNotes = notes.filter(n => {
    try {
      const parsed = JSON.parse(n.entities_json || '{}');
      return parsed.category === category;
    } catch(e) { return false; }
  });

  if (catNotes.length < 3) return "this thread is just beginning to find its voice";

  const hours = catNotes.map(n => new Date(n.created_at).getHours());
  const lateNight = hours.filter(h => h > 21 || h < 5).length;
  const morning = hours.filter(h => h >= 5 && h < 12).length;

  const total = catNotes.length;
  if (lateNight / total > 0.6) return `your subconscious reaches for ${category.toLowerCase()} mostly in the deep night (${lateNight}x)`;
  if (morning / total > 0.6) return `you frame your ${category.toLowerCase()} thoughts mostly in the early light (${morning}x)`;
  
  return `you've returned to ${category.toLowerCase()} ${total} times this cycle — it's seeking a synthesis`;
}

/**
 * Nexus 12.0: The Mental Momentum Engine
 */
export function getMentalMomentum(notes: Note[]): Record<string, number> {
  const momentum: Record<string, number> = {};
  const now = Date.now();
  const past24h = now - (24 * 60 * 60 * 1000);

  notes.forEach(note => {
    let cat = 'Journal';
    try {
      const parsed = JSON.parse(note.entities_json || '{}');
      cat = parsed.category || 'Journal';
    } catch(e){}

    const weight = (note.created_at > past24h) ? 2 : 1;
    momentum[cat] = (momentum[cat] || 0) + weight;
  });

  return momentum;
}
