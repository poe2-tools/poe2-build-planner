import type { TreeData } from './types';

/**
 * Shortest path (by edge count) from any node in `sources` to `target`, inclusive of
 * the source endpoint and the target. Returns null if `target` is unreachable.
 * Nodes in `blocked` are never traversed; a blocked `target` is unreachable.
 */
export function shortestPathFromAny(
  tree: TreeData,
  sources: Set<number>,
  target: number,
  blocked: Set<number> = new Set(),
): number[] | null {
  if (blocked.has(target)) return null;
  if (sources.has(target)) return [target];
  const adjacency = tree.navAdjacency ?? tree.adjacency;
  const prev = new Map<number, number>();
  const visited = new Set<number>(sources);
  const queue: number[] = [...sources];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nb of adjacency.get(cur) ?? []) {
      if (visited.has(nb) || blocked.has(nb)) continue;
      visited.add(nb);
      prev.set(nb, cur);
      if (nb === target) {
        const path: number[] = [];
        let c: number | undefined = target;
        while (c !== undefined && !sources.has(c)) {
          path.push(c);
          c = prev.get(c);
        }
        if (c !== undefined) path.push(c);
        return path.reverse();
      }
      queue.push(nb);
    }
  }
  return null;
}

/** Sources default to the start node when nothing is allocated yet. */
function sourcesOf(allocated: Set<number>, start: number): Set<number> {
  return allocated.size ? allocated : new Set([start]);
}

/** True if `target` is an immediate neighbour of an allocated node (next-step allocatable). */
export function isAdjacentToAllocated(
  tree: TreeData,
  allocated: Set<number>,
  start: number,
  target: number,
  blocked: Set<number> = new Set(),
): boolean {
  if (blocked.has(target)) return false;
  const sources = sourcesOf(allocated, start);
  if (sources.has(target)) return false;
  const adjacency = tree.navAdjacency ?? tree.adjacency;
  return (adjacency.get(target) ?? []).some((nb) => sources.has(nb));
}

/**
 * Allocate `target` by adding the shortest connecting path from the existing tree
 * (PoB-style). No-op if already allocated or unreachable. Always keeps `start` allocated.
 */
export function allocate(
  tree: TreeData,
  allocated: Set<number>,
  start: number,
  target: number,
  blocked: Set<number> = new Set(),
): Set<number> {
  if (allocated.has(target)) return allocated;
  const path = shortestPathFromAny(tree, sourcesOf(allocated, start), target, blocked);
  if (!path) return allocated;
  const next = new Set(allocated);
  next.add(start);
  for (const s of path) next.add(s);
  return next;
}

/**
 * Remove `target` and any node that is no longer connected to `start` through the
 * remaining allocated nodes. No-op when removing the start node itself.
 */
export function deallocate(
  tree: TreeData,
  allocated: Set<number>,
  start: number,
  target: number,
  blocked: Set<number> = new Set(),
): Set<number> {
  if (target === start || !allocated.has(target)) return allocated;
  const remaining = new Set(allocated);
  remaining.delete(target);

  const adjacency = tree.navAdjacency ?? tree.adjacency;
  const keep = new Set<number>();
  if (remaining.has(start)) {
    const queue: number[] = [start];
    keep.add(start);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nb of adjacency.get(cur) ?? []) {
        if (remaining.has(nb) && !keep.has(nb) && !blocked.has(nb)) {
          keep.add(nb);
          queue.push(nb);
        }
      }
    }
  }
  return keep;
}

export interface PointTotals {
  main: number;
  ascendancy: number;
}

/**
 * Count allocated points by pool. Class-start, ascendancy-start, and multiple-choice option
 * nodes are free (the option's point is spent on its parent notable). Nodes carrying an
 * `ascendancyId` count toward the ascendancy pool; all others count toward the main pool.
 */
export function pointsUsed(tree: TreeData, allocated: Set<number>): PointTotals {
  let main = 0;
  let ascendancy = 0;
  for (const skill of allocated) {
    const n = tree.nodesBySkill.get(skill);
    if (!n) continue;
    if (n.classStartIndex !== undefined) continue;
    if (n.isAscendancyStart) continue;
    if (n.isMultipleChoiceOption) continue;
    if (n.ascendancyId) ascendancy++;
    else main++;
  }
  return { main, ascendancy };
}
