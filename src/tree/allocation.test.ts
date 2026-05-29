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
