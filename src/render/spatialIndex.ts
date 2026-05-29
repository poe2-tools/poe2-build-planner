import type { TreeData } from '../tree/types';
import type { WorldRect } from './viewport';

export interface SpatialIndex {
  cellSize: number;
  cells: Map<string, number[]>; // "cx,cy" -> skill ids
}

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function buildSpatialIndex(tree: TreeData, cellSize = 400): SpatialIndex {
  const cells = new Map<string, number[]>();
  for (const skill of tree.mainSkills) {
    const n = tree.nodesBySkill.get(skill);
    if (!n) continue;
    const key = cellKey(Math.floor(n.x / cellSize), Math.floor(n.y / cellSize));
    const bucket = cells.get(key);
    if (bucket) bucket.push(n.skill);
    else cells.set(key, [n.skill]);
  }
  return { cellSize, cells };
}

export function queryRect(index: SpatialIndex, rect: WorldRect): number[] {
  const { cellSize, cells } = index;
  const minCx = Math.floor(rect.minX / cellSize);
  const maxCx = Math.floor(rect.maxX / cellSize);
  const minCy = Math.floor(rect.minY / cellSize);
  const maxCy = Math.floor(rect.maxY / cellSize);
  const out: number[] = [];
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const bucket = cells.get(cellKey(cx, cy));
      if (bucket) out.push(...bucket);
    }
  }
  return out;
}

/** Nearest node to (wx, wy) within `radius` world units, or null. */
export function nodeAt(index: SpatialIndex, tree: TreeData, wx: number, wy: number, radius: number): number | null {
  const candidates = queryRect(index, { minX: wx - radius, minY: wy - radius, maxX: wx + radius, maxY: wy + radius });
  let best: number | null = null;
  let bestDist = radius * radius;
  for (const skill of candidates) {
    const n = tree.nodesBySkill.get(skill)!;
    const dx = n.x - wx;
    const dy = n.y - wy;
    const d = dx * dx + dy * dy;
    if (d <= bestDist) {
      bestDist = d;
      best = skill;
    }
  }
  return best;
}
