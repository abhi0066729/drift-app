import { Note } from '@/store/useNotesStore';

export interface GalaxyNode {
  id: string;
  x: number;
  y: number;
  note: Note;
  radius: number;
  color: string;
  energy: number;
}

export interface Constellation {
  id: string;
  nodes: GalaxyNode[];
  edges: [GalaxyNode, GalaxyNode][];
  category: string;
  energy: number;
  vibration: number;
}

/**
 * Void Engine PRNG
 * Ensures the galaxy layout is stable and uniform across renders.
 */
class GalaxyPRNG {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/**
 * Nexus Galaxy Engine
 * Computes spatial distribution and energy-governed constellations.
 */
export function computeGalaxyLayout(notes: Note[], width: number, height: number) {
  if (!notes || notes.length === 0) return { nodes: [], constellations: [] };

  const prng = new GalaxyPRNG(42);
  const galaxyRadius = Math.min(width, height) * 0.75; // Tighter galaxy as requested
  const centerX = width / 2;
  const centerY = height / 2;

  // 1. Map notes to GalaxyNodes
  const nodes: GalaxyNode[] = notes.map(note => {
    // Standard galaxy distribution: Higher density toward the core
    const angle = prng.next() * Math.PI * 2;
    const distance = Math.pow(prng.next(), 0.8) * galaxyRadius;
    
    let category = 'Journal';
    try {
      const parsed = JSON.parse(note.entities_json || '{}');
      category = parsed.category || 'Journal';
    } catch(e) {}

    return {
      id: note.id,
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      note,
      radius: 4 + (prng.next() * 4),
      color: '#A78BFA', // Default theme color
      energy: 1.0
    };
  });

  // 2. Compute Constellations (Energy-governed spanning trees)
  const categoryGroups: Record<string, GalaxyNode[]> = {};
  nodes.forEach(node => {
    let cat = 'Journal';
    try {
      cat = JSON.parse(node.note.entities_json || '{}').category || 'Journal';
    } catch(e) {}
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(node);
  });

  const constellations: Constellation[] = [];
  Object.entries(categoryGroups).forEach(([cat, group]) => {
    if (group.length < 2) return;

    const edges: [GalaxyNode, GalaxyNode][] = [];
    const connected = new Set([group[0].id]);
    const remaining = group.slice(1);

    // Simple Prim-like algorithm for a skeletal spanning tree
    while (remaining.length > 0) {
      let bestDist = Infinity;
      let bestPair: [GalaxyNode, GalaxyNode] | null = null;
      let bestIdx = -1;

      for (const cNodeId of connected) {
        const cNode = group.find(n => n.id === cNodeId)!;
        remaining.forEach((rNode, idx) => {
          const d = Math.sqrt(Math.pow(cNode.x - rNode.x, 2) + Math.pow(cNode.y - rNode.y, 2));
          if (d < bestDist) {
            bestDist = d;
            bestPair = [cNode, rNode];
            bestIdx = idx;
          }
        });
      }

      if (bestPair) {
        edges.push(bestPair);
        connected.add(bestPair[1].id);
        remaining.splice(bestIdx, 1);
      } else break;
    }

    // Energy Dynamics
    const baseEnergy = group.length * 0.15;
    const energyLimit = 1.2;
    const vibration = baseEnergy > energyLimit ? (baseEnergy - energyLimit) * 5 : 0;

    constellations.push({
      id: `const-${cat}`,
      nodes: group,
      edges,
      category: cat,
      energy: baseEnergy,
      vibration
    });
  });

  return { nodes, constellations };
}
