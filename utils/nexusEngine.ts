/**
 * nexusEngine.ts
 *
 * THE VOID ENGINE (v8) — True Constellation Architecture:
 * - Seeded PRNG (mulberry32) for truly uniform, unbiased 360° scatter.
 * - Constellation Personality: ~20% of stars are anchors that branch outward.
 * - Category-strict bonds: Journal→Journal, Idea→Idea, etc.
 * - Single massive unified galaxy — no isolated islands.
 */

import { Note } from '@/store/useNotesStore';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

export type NexusNode = {
  id: string;
  content: string;
  x: number;
  y: number;
  energy: number;
  radius: number;
  opacity: number;
  clusterId: string;
  isDust?: boolean;
  entities_json?: string;
  isAnchor?: boolean;
  created_at?: number;
  category?: string;
  categories?: string[];
  emotion?: string;
  resonances?: Record<string, number>;
  pipeline_step?: string;
  images?: string[];
  semantic_links?: string[];
};

export type NexusBond = {
  id: string;
  sourceId: string;
  targetId: string;
  opacity: number;
  isAnchorBond?: boolean;
  constellationEnergy?: number; // Total energy of the constellation this bond belongs to
  isVibrating?: boolean;        // True when constellation energy exceeds VIBRATE_THRESHOLD
};

export type NexusLayout = {
  nodes: NexusNode[];
  dust: NexusNode[];
  bonds: NexusBond[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

// ─── Seeded PRNG (mulberry32) — uniform, deterministic ───────────────────────
function makePRNG(seed: number) {
  let s = seed >>> 0;
  return (): number => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function computeSimilarity(a: Note, b: Note): number {
  const tok = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const tokA = tok(a.content);
  const tokB = tok(b.content);
  if (tokA.size === 0 || tokB.size === 0) return 0;
  
  const tokAArray = Array.from(tokA);
  const intersection = tokAArray.filter(w => tokB.has(w)).length;
  const union = new Set([...tokAArray, ...Array.from(tokB)]).size;
  return union === 0 ? 0 : intersection / union;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function computeConstellations(notes: Note[]): NexusLayout {
  const { width, height } = Dimensions.get('window');
  const visible = notes.filter(n => !n.is_deleted && !n.is_ghost && n.content?.length > 0);
  if (visible.length === 0) return { nodes: [], dust: [], bonds: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };

  const noteMap = new Map<string, Note>();
  visible.forEach(n => noteMap.set(n.id, n));

  const center = { x: width / 2, y: height / 2 };
  const galaxyRadius = Math.max(width, height) * 0.75;

  // 1. Truly Uniform Scatter via seeded PRNG
  const nodes: NexusNode[] = [];
  const sortedNotes = [...visible].sort((a, b) => a.id.localeCompare(b.id));
  const scatterRng = makePRNG(hash("galaxy-seed-v8.1"));

  sortedNotes.forEach((note) => {
    const angle = scatterRng() * Math.PI * 2;           
    const dist = Math.sqrt(scatterRng()) * galaxyRadius; 

    const energy = 0.2 + 0.8 * Math.exp(
      -(Date.now() - note.created_at) / (1000 * 60 * 60 * 24 * 7)
    );

    let category = 'Journal';
    let semantic_links: string[] = [];
    if (note.entities_json) {
      try {
        const parsed = JSON.parse(note.entities_json);
        category = parsed.category || parsed.categories?.[0] || 'Journal';
        if (parsed.semantic_links) semantic_links = parsed.semantic_links;
      } catch (_) {}
    }

    const personalityRng = makePRNG(hash(note.id));
    const isAnchor = personalityRng() < 0.2;

    let emotion = '';
    if (note.entities_json) {
      try {
        const parsed = JSON.parse(note.entities_json);
        emotion = parsed.emotion || '';
      } catch (_) {}
    }

    const wordCount = note.word_count || 0;
    const sizeMultiplier = note.note_type === 'page' || wordCount > 280 ? 1.8 : (wordCount > 100 ? 1.4 : 1.0);
    const baseRadius = isAnchor ? 5.5 : (energy > 0.8 ? 4.0 : 2.5);

    nodes.push({
      id: note.id,
      content: note.content,
      x: center.x + Math.cos(angle) * dist,
      y: center.y + Math.sin(angle) * dist,
      energy,
      radius: baseRadius * sizeMultiplier,
      opacity: Math.max(0.7, energy),
      clusterId: category,
      entities_json: note.entities_json,
      isAnchor,
      created_at: note.created_at,
      category,
      emotion,
      resonances: note.resonances,
      pipeline_step: note.pipeline_step,
      images: note.images,
      semantic_links,
    });
  });

  // 2. Force-Directed Relaxation
  for (let iter = 0; iter < 15; iter++) {
    nodes.forEach((n1, i) => {
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy || 1;
        const minSpacing = 85; 
        if (distSq < minSpacing * minSpacing) {
          const d = Math.sqrt(distSq);
          const force = (minSpacing - d) * 0.4;
          const nx = dx / d, ny = dy / d;
          n1.x -= nx * force; n1.y -= ny * force;
          n2.x += nx * force; n2.y += ny * force;
        }
      }
    });
  }

  // 3. Galactic Dust
  const dust: NexusNode[] = [];
  const dustRng = makePRNG(hash("dust-seed-v8.1"));
  for (let i = 0; i < 250; i++) {
    const angle = dustRng() * Math.PI * 2;
    const dist = Math.sqrt(dustRng()) * galaxyRadius * 1.2;
    dust.push({
      id: `dust-${i}`,
      content: '',
      x: center.x + Math.cos(angle) * dist,
      y: center.y + Math.sin(angle) * dist,
      energy: 0,
      radius: 0.2 + dustRng() * 0.6,
      opacity: 0.02 + dustRng() * 0.05,
      clusterId: 'void',
      isDust: true,
    });
  }

  // 4. Natural Constellation Bonds
  const bonds: NexusBond[] = [];
  const SPATIAL_LIMIT = 280;
  const SIM_THRESHOLD = 0.12;
  const connectionCounts = new Map<string, number>();
  nodes.forEach((n1) => {
    if (n1.isDust) return;

    const note1 = noteMap.get(n1.id);
    const isPage1 = note1?.note_type === 'page' || (note1?.word_count && note1.word_count > 280);
    const currentSpatialLimit = isPage1 ? SPATIAL_LIMIT * 1.5 : SPATIAL_LIMIT;
    const maxBonds = isPage1 ? 12 : 8;

    const targets = nodes
      .filter(n2 => n2.id !== n1.id && !n2.isDust)
      .map(n2 => {
        const dx = n2.x - n1.x, dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Extract semantic weight from AI resonances & real neural embeddings
        let semanticWeight = 0;
        if (n1.semantic_links && n1.semantic_links.includes(n2.id)) {
            semanticWeight = 2.0; // Guaranteed neural connection
        } else if (n1.resonances && n1.resonances[n2.clusterId]) {
            semanticWeight = n1.resonances[n2.clusterId];
        } else if (n1.clusterId === n2.clusterId) {
            semanticWeight = 0.5; // Fallback for same category
        }

        const note2 = noteMap.get(n2.id);
        const wordSim = (note1 && note2) ? computeSimilarity(note1, note2) : 0;
        
        const totalSim = Math.max(semanticWeight, wordSim * 2);

        return { node: n2, dist, sim: totalSim, weight: dist / (totalSim + 0.1) };
      })
      .filter(t => t.dist < currentSpatialLimit && (t.sim > SIM_THRESHOLD || t.dist < 120))
      .sort((a, b) => a.weight - b.weight)
      .slice(0, maxBonds);

    targets.forEach(t => {
      const tId = t.node.id;
      const bid = [n1.id, tId].sort().join('~');
      if (!bonds.some(b => b.id === bid)) {
        bonds.push({
          id: bid,
          sourceId: n1.id,
          targetId: tId,
          opacity: Math.min(n1.opacity, t.node.opacity) * 0.85,
          isAnchorBond: n1.isAnchor || t.node.isAnchor,
        });
        connectionCounts.set(n1.id, (connectionCounts.get(n1.id) || 0) + 1);
        connectionCounts.set(tId, (connectionCounts.get(tId) || 0) + 1);
      }
    });
  });

  // 5. Energy System
  const VIBRATE_THRESHOLD = 4.5;
  const BREAK_THRESHOLD   = 7.0;

  const parent = new Map<string, string>();
  nodes.forEach(n => parent.set(n.id, n.id));
  function find(x: string): string {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  bonds.forEach(b => {
    const ra = find(b.sourceId), rb = find(b.targetId);
    if (ra !== rb) parent.set(ra, rb);
  });

  const componentEnergy = new Map<string, number>();
  const componentBonds  = new Map<string, NexusBond[]>();
  bonds.forEach(b => {
    const root = find(b.sourceId);
    const srcNode = nodes.find(n => n.id === b.sourceId);
    const tgtNode = nodes.find(n => n.id === b.targetId);
    const bondEnergy = ((srcNode?.energy ?? 0) + (tgtNode?.energy ?? 0)) / 2;
    componentEnergy.set(root, (componentEnergy.get(root) ?? 0) + bondEnergy);
    if (!componentBonds.has(root)) componentBonds.set(root, []);
    componentBonds.get(root)!.push(b);
  });

  const brokenBondIds = new Set<string>();
  componentEnergy.forEach((energy, root) => {
    const cBonds = componentBonds.get(root) ?? [];
    if (energy > VIBRATE_THRESHOLD) {
      cBonds.forEach(b => { b.isVibrating = true; b.constellationEnergy = energy; });
    }
    if (energy > BREAK_THRESHOLD) {
      const sorted = [...cBonds].sort((a, b) => a.opacity - b.opacity);
      let remainingEnergy = energy;
      for (const bond of sorted) {
        if (remainingEnergy <= BREAK_THRESHOLD) break;
        const srcNode = nodes.find(n => n.id === bond.sourceId);
        const tgtNode = nodes.find(n => n.id === bond.targetId);
        const bondEnergy = ((srcNode?.energy ?? 0) + (tgtNode?.energy ?? 0)) / 2;
        brokenBondIds.add(bond.id);
        remainingEnergy -= bondEnergy;
      }
    }
  });

  const finalBonds = bonds.filter(b => !brokenBondIds.has(b.id));

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
  });
  dust.forEach(n => {
    minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
  });

  return { nodes, dust, bonds: finalBonds, bounds: { minX, maxX, minY, maxY } };
}
