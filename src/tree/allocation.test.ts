import { describe, it, expect } from 'vitest';
import type { TreeData, TreeNode } from './types';
import { shortestPathFromAny, isAdjacentToAllocated, allocate, deallocate } from './allocation';

function node(skill: number, partial: Partial<TreeNode> = {}): TreeNode {
  return {
    skill, id: `n${skill}`, name: `n${skill}`, stats: [], x: 0, y: 0,
    group: 0, orbit: 0, orbitIndex: 0, inNodes: [], outNodes: [], ...partial,
  };
}

function miniTree(): TreeData {
  const adjacency = new Map<number, number[]>([
    [0, [1]], [1, [0, 2, 4]], [2, [1, 3]], [3, [2]], [4, [1]],
  ]);
  const nodesBySkill = new Map<number, TreeNode>([
    [0, node(0, { classStartIndex: [0] })],
    [1, node(1)], [2, node(2)], [3, node(3)], [4, node(4)],
  ]);
  return {
    nodesBySkill, nodesById: new Map(), adjacency, classes: [], classStartNodes: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    mainSkills: [...nodesBySkill.keys()], ascendancySkills: new Map(), groups: new Map(),
  };
}

describe('shortestPathFromAny', () => {
  it('finds the shortest path from a source set to a target', () => {
    expect(shortestPathFromAny(miniTree(), new Set([0]), 3)).toEqual([0, 1, 2, 3]);
  });
  it('returns [target] when target is already a source', () => {
    expect(shortestPathFromAny(miniTree(), new Set([2]), 2)).toEqual([2]);
  });
});

describe('isAdjacentToAllocated', () => {
  it('is true for a neighbour of an allocated node', () => {
    expect(isAdjacentToAllocated(miniTree(), new Set([0, 1]), 0, 2)).toBe(true);
  });
  it('is false for a non-neighbour', () => {
    expect(isAdjacentToAllocated(miniTree(), new Set([0, 1]), 0, 3)).toBe(false);
  });
});

describe('allocate', () => {
  it('allocates the shortest path from the start when nothing is allocated', () => {
    const result = allocate(miniTree(), new Set(), 0, 3);
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });
  it('extends from the nearest allocated node', () => {
    const result = allocate(miniTree(), new Set([0, 1, 2, 3]), 0, 4);
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });
  it('is a no-op when the target is already allocated', () => {
    const before = new Set([0, 1]);
    expect(allocate(miniTree(), before, 0, 1)).toBe(before);
  });
});

describe('deallocate', () => {
  it('removes the target and any node it orphans', () => {
    // 0-1-2-3 with 1-4; removing 2 orphans 3 (only reachable via 2).
    const result = deallocate(miniTree(), new Set([0, 1, 2, 3, 4]), 0, 2);
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 4]);
  });
  it('keeps siblings that remain connected', () => {
    const result = deallocate(miniTree(), new Set([0, 1, 2, 4]), 0, 2);
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1, 4]);
  });
  it('never removes the start node', () => {
    const result = deallocate(miniTree(), new Set([0, 1]), 0, 0);
    expect(result).toEqual(new Set([0, 1]));
  });
});

describe('blocked traversal (fallback adjacency)', () => {
  it('does not route a path through a blocked node', () => {
    // 0-1-2-3, 1-4. Blocking 2 makes 3 unreachable from 0.
    expect(shortestPathFromAny(miniTree(), new Set([0]), 3, new Set([2]))).toBeNull();
  });
  it('treats a blocked target as unreachable', () => {
    expect(shortestPathFromAny(miniTree(), new Set([0]), 2, new Set([2]))).toBeNull();
  });
  it('isAdjacentToAllocated is false for a blocked target', () => {
    expect(isAdjacentToAllocated(miniTree(), new Set([0, 1]), 0, 2, new Set([2]))).toBe(false);
  });
  it('allocate returns unchanged when the target is blocked', () => {
    const before = new Set([0, 1]);
    expect(allocate(miniTree(), before, 0, 2, new Set([2]))).toBe(before);
  });
  it('deallocate orphan-removal skips blocked nodes', () => {
    // 0-1-2-3 with 1-4 allocated. Removing 4 while 2 is blocked: 3 is now only
    // reachable through the blocked 2, so it is orphaned too.
    const result = deallocate(miniTree(), new Set([0, 1, 2, 3, 4]), 0, 4, new Set([2]));
    expect([...result].sort((a, b) => a - b)).toEqual([0, 1]);
  });
});

function navTree(): TreeData {
  const navAdjacency = new Map<number, number[]>([
    [0, [1]], [1, [0, 2, 4]], [2, [1, 3]], [3, [2]], [4, [1]],
  ]);
  // A different (looser) adjacency to prove navAdjacency is preferred over adjacency.
  const adjacency = new Map<number, number[]>([
    [0, [1, 3]], [1, [0, 2, 4]], [2, [1, 3]], [3, [0, 2]], [4, [1]],
  ]);
  const nodesBySkill = new Map<number, TreeNode>([
    [0, node(0, { classStartIndex: [0] })],
    [1, node(1)], [2, node(2)], [3, node(3)], [4, node(4)],
  ]);
  return {
    nodesBySkill, nodesById: new Map(), adjacency, navAdjacency, classes: [], classStartNodes: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    mainSkills: [...nodesBySkill.keys()], ascendancySkills: new Map(), groups: new Map(),
  };
}

describe('navAdjacency preference', () => {
  it('traverses navAdjacency rather than adjacency when present', () => {
    // adjacency has a 0-3 shortcut; navAdjacency does not, so the path goes 0-1-2-3.
    expect(shortestPathFromAny(navTree(), new Set([0]), 3)).toEqual([0, 1, 2, 3]);
  });
});
