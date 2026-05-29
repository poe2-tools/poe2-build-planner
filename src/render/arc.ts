import type { TreeNode, GroupMap } from '../tree/types';

export type EdgeGeom =
  | { kind: 'line' }
  | { kind: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number; anticlockwise: boolean };

/**
 * Geometry of the edge a->b. Returns an `arc` around the group centre when both endpoints
 * share group + orbit (orbit > 0) and the centre is known; otherwise a straight `line`.
 * The arc is the minor arc (shorter angular direction between the two endpoints).
 */
export function edgeGeometry(a: TreeNode, b: TreeNode, groups: GroupMap): EdgeGeom {
  if (a.group !== b.group || a.orbit !== b.orbit || a.orbit <= 0) return { kind: 'line' };
  const g = groups.get(a.group);
  if (!g) return { kind: 'line' };

  const r = Math.hypot(a.x - g.x, a.y - g.y);
  const a0 = Math.atan2(a.y - g.y, a.x - g.x);
  const a1 = Math.atan2(b.y - g.y, b.x - g.x);

  let delta = a1 - a0;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  while (delta > Math.PI) delta -= 2 * Math.PI;

  return { kind: 'arc', cx: g.x, cy: g.y, r, a0, a1, anticlockwise: delta < 0 };
}
