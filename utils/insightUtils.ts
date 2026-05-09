import { Note } from '@/store/useNotesStore';
import { NoteCategory } from '@/services/ai';

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'topic';
  count: number;
  lastSeen: number;
  color: string;
  categoryContext: Record<string, number>;
}

export interface InsightMomentum {
  category: NoteCategory;
  percentage: number;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Aggregates all entities (People and Topics) from note metadata
 */
export function aggregateEntities(notes: Note[]): Entity[] {
  const entityMap = new Map<string, Entity>();
  const COLORS = ['#8E44AD', '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#E74C3C'];

  notes.forEach(note => {
    let entities: { people?: string[], topics?: string[], category?: string } = {};
    try {
      entities = JSON.parse(note.entities_json || '{}');
    } catch (e) { return; }

    const combined = [
      ...(entities.people || []).map(p => ({ name: p, type: 'person' as const })),
      ...(entities.topics || []).map(t => ({ name: t, type: 'topic' as const }))
    ];

    combined.forEach(item => {
      const key = `${item.type}:${item.name}`;
      if (entityMap.has(key)) {
        const entry = entityMap.get(key)!;
        entry.count += 1;
        entry.lastSeen = Math.max(entry.lastSeen, note.created_at);
        if (entities.category) {
          entry.categoryContext[entities.category] = (entry.categoryContext[entities.category] || 0) + 1;
        }
      } else {
        entityMap.set(key, {
          id: key,
          name: item.name,
          type: item.type,
          count: 1,
          lastSeen: note.created_at,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          categoryContext: entities.category ? { [entities.category]: 1 } : {}
        });
      }
    });
  });

  return Array.from(entityMap.values()).sort((a, b) => b.count - a.count);
}

export interface SynthesisInsight {
  id: string;
  type: 'correlation' | 'emotion' | 'shift';
  title: string;
  description: string;
  resonance: number;
}

/**
 * Deep Synthesis: Detects high-level patterns across the notes
 */
export function getSynthesisInsights(notes: Note[]): SynthesisInsight[] {
  if (notes.length < 5) return [];

  const entities = aggregateEntities(notes);
  const insights: SynthesisInsight[] = [];
  
  // 1. Correlation Detection (Resonance Clusters)
  // Find top co-occurrence pairs
  const pairs: Record<string, number> = {};
  notes.forEach(note => {
    try {
      const e = JSON.parse(note.entities_json || '{}');
      const all = [...(e.people || []), ...(e.topics || [])];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const key = [all[i], all[j]].sort().join(' + ');
          pairs[key] = (pairs[key] || 0) + 1;
        }
      }
    } catch(e) {}
  });

  const topPair = Object.entries(pairs)
    .sort((a, b) => b[1] - a[1])[0];

  if (topPair && topPair[1] > 2) {
    insights.push({
      id: 'cluster-1',
      type: 'correlation',
      title: 'Strong Resonance Detected',
      description: `${topPair[0]} appear together in ${topPair[1]} notes. A potential project or focus area is emerging.`,
      resonance: 0.85
    });
  }

  // 2. Emotional Anchors
  const emotions: Record<string, Record<string, number>> = {};
  notes.forEach(note => {
    try {
      const e = JSON.parse(note.entities_json || '{}');
      if (e.emotion && e.category) {
        if (!emotions[e.category]) emotions[e.category] = {};
        emotions[e.category][e.emotion] = (emotions[e.category][e.emotion] || 0) + 1;
      }
    } catch(e) {}
  });

  Object.entries(emotions).forEach(([cat, emots]) => {
    const topEmot = Object.entries(emots).sort((a, b) => b[1] - a[1])[0];
    if (topEmot && topEmot[1] > 2 && topEmot[0] !== 'Neutral') {
      insights.push({
        id: `emotion-${cat}`,
        type: 'emotion',
        title: `${cat} Energy`,
        description: `Your ${cat} sessions are consistently linked to feeling '${topEmot[0]}'.`,
        resonance: 0.7
      });
    }
  });

  // 3. Focus Shifts (Momentum comparison)
  const mom = getCategoryMomentum(notes);
  if (mom.length > 0 && mom[0].trend === 'up') {
    insights.push({
      id: 'shift-1',
      type: 'shift',
      title: 'Dominant Shift',
      description: `Your thoughts are gravitating significantly toward ${mom[0].category} lately. Is this your primary focus right now?`,
      resonance: 0.9
    });
  }

  return insights;
}

/**
 * Calculates current mental momentum based on category distribution
 */
export function getCategoryMomentum(notes: Note[]): InsightMomentum[] {
  if (notes.length === 0) return [];
  
  const recentNotes = notes.slice(0, 50);
  const vRecentNotes = notes.slice(0, 20);
  
  const counts: Record<string, number> = {};
  const vCounts: Record<string, number> = {};
  
  recentNotes.forEach(n => {
    try {
      const e = JSON.parse(n.entities_json || '{}');
      if (e.category) counts[e.category] = (counts[e.category] || 0) + 1;
    } catch(e) {}
  });

  vRecentNotes.forEach(n => {
    try {
      const e = JSON.parse(n.entities_json || '{}');
      if (e.category) vCounts[e.category] = (vCounts[e.category] || 0) + 1;
    } catch(e) {}
  });

  const total = recentNotes.length;
  const vTotal = Math.max(1, vRecentNotes.length);
  
  return Object.entries(counts).map(([cat, count]) => {
    const percentage = (count / total) * 100;
    const vPercentage = (vCounts[cat] || 0) / vTotal * 100;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (vPercentage > percentage + 10) trend = 'up';
    else if (vPercentage < percentage - 10) trend = 'down';

    return {
      category: cat as NoteCategory,
      percentage,
      count,
      trend
    };
  }).sort((a, b) => b.percentage - a.percentage);
}

export interface SerendipityEcho {
  id: string;
  note: Note;
  reason: string;
  resonanceScore: number;
}

/**
 * Serendipity Oracle: Finds forgotten notes semantically linked to today
 */
export function getSerendipityEchoes(notes: Note[]): SerendipityEcho[] {
  if (notes.length < 10) return [];

  const now = Date.now();
  const ONE_DAY = 86400000;
  const THIRTY_DAYS = ONE_DAY * 30;

  const recentNotes = notes.filter(n => (now - n.created_at) < (ONE_DAY * 3));
  const oldNotes = notes.filter(n => (now - n.created_at) > THIRTY_DAYS);

  if (recentNotes.length === 0 || oldNotes.length === 0) return [];

  // Extract entities from recent notes
  const recentEntities = new Set<string>();
  recentNotes.forEach(n => {
    try {
      const e = JSON.parse(n.entities_json || '{}');
      [...(e.people || []), ...(e.topics || [])].forEach(ent => recentEntities.add(ent));
    } catch(e) {}
  });

  const echoes: SerendipityEcho[] = [];
  oldNotes.forEach(oldNote => {
    try {
      const e = JSON.parse(oldNote.entities_json || '{}');
      const shared = [...(e.people || []), ...(e.topics || [])].filter(ent => recentEntities.has(ent));
      
      if (shared.length > 0) {
        echoes.push({
          id: `echo-${oldNote.id}`,
          note: oldNote,
          reason: `Echoes your current focus on ${shared[0]}`,
          resonanceScore: 0.5 + (shared.length * 0.1)
        });
      }
    } catch(e) {}
  });

  return echoes.sort((a, b) => b.resonanceScore - a.resonanceScore).slice(0, 3);
}

/**
 * Future Prophecy: Predicts category movement based on trend momentum
 */
export function getFutureProphecy(notes: Note[]): { category: NoteCategory; probability: number } | null {
  const momentum = getCategoryMomentum(notes);
  const upTrend = momentum.find(m => m.trend === 'up');
  
  if (upTrend) {
    return {
      category: upTrend.category,
      probability: upTrend.percentage + 20
    };
  }
  
  return null;
}

/**
 * Detects 'Co-occurrence' clusters for the Nebula Hub
 */
export function getEntityConnections(entityAId: string, entityBId: string, notes: Note[]): number {
  let strength = 0;
  const nameA = entityAId.split(':')[1];
  const nameB = entityBId.split(':')[1];

  notes.forEach(note => {
    if (note.content.includes(nameA) && note.content.includes(nameB)) {
      strength += 1;
    }
  });

  return strength;
}
