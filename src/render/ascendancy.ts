import type { TreeData } from '../tree/types';
import { nodeKind } from '../tree/data';
import { NODE_WORLD_RADIUS } from './lod';

export interface AscNodeLayout { skill: number; wx: number; wy: number; wr: number }

export interface AscendancyLayout {
  ascendancyId: string;
  cx: number;
  cy: number;
  radius: number;
  bgSize: number;
  nodes: AscNodeLayout[];
  bySkill: Map<number, AscNodeLayout>;
}

const FIT_DIAMETER = 1550; // world span the node cluster's larger dimension scales to
const DISC_PAD = 80; // world units of backing-disc margin beyond the outermost node
const BG_OVERSCAN = 1.18; // background art square is a bit larger than the node disc

/** Lay the ascendancy out in world space, centred on the tree hub (0,0). Null if it has no nodes. */
export function ascendancyLayout(tree: TreeData, ascendancyId: string): AscendancyLayout | null {
  const skills = tree.ascendancySkills.get(ascendancyId);
  if (!skills || skills.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of skills) {
    const n = tree.nodesBySkill.get(s)!;
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }

  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const scale = FIT_DIAMETER / Math.max(bw, bh);
  const bcx = (minX + maxX) / 2;
  const bcy = (minY + maxY) / 2;

  const nodes: AscNodeLayout[] = [];
  const bySkill = new Map<number, AscNodeLayout>();
  let maxReach = 0;
  for (const s of skills) {
    const n = tree.nodesBySkill.get(s)!;
    const layout: AscNodeLayout = {
      skill: s,
      wx: (n.x - bcx) * scale,
      wy: (n.y - bcy) * scale,
      wr: NODE_WORLD_RADIUS[nodeKind(n)] * scale,
    };
    const reach = Math.hypot(layout.wx, layout.wy) + layout.wr;
    if (reach > maxReach) maxReach = reach;
    nodes.push(layout);
    bySkill.set(s, layout);
  }

  const radius = maxReach + DISC_PAD;
  return { ascendancyId, cx: 0, cy: 0, radius, bgSize: radius * 2 * BG_OVERSCAN, nodes, bySkill };
}

const HIT_PAD = 6; // screen px of slack around a node's projected radius

/** Nearest overlay node to a world point within its (px-padded) radius, or null. */
export function hitAscendancy(layout: AscendancyLayout, wx: number, wy: number, zoom: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const n of layout.nodes) {
    const dx = n.wx - wx;
    const dy = n.wy - wy;
    const d = dx * dx + dy * dy;
    const reach = n.wr + HIT_PAD / zoom;
    if (d <= reach * reach && d < bestDist) {
      bestDist = d;
      best = n.skill;
    }
  }
  return best;
}
