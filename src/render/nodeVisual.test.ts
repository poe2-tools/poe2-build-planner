import { describe, it, expect } from 'vitest';
import type { TreeData, TreeNode } from '../tree/types';
import { visualState } from './nodeVisual';

function node(skill: number): TreeNode {
  return {
    skill, id: `n${skill}`, name: `n${skill}`, stats: [], x: 0, y: 0,
    group: 0, orbit: 0, orbitIndex: 0, inNodes: [], outNodes: [],
  };
}
// graph 0-1-2 ; 0 is the start
const tree: TreeData = {
  nodesBySkill: new Map([0, 1, 2].map((s) => [s, node(s)])),
  nodesById: new Map(), classes: [], classStartNodes: [],
  adjacency: new Map([[0, [1]], [1, [0, 2]], [2, [1]]]),
  bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  mainSkills: [0, 1, 2], ascendancySkills: new Map(), groups: new Map(),
};

describe('visualState', () => {
  it('is allocated for an allocated node', () => {
    expect(visualState(tree, new Set([0, 1]), 0, 1)).toBe('allocated');
  });
  it('is canAllocate for an unallocated neighbour of the allocated set', () => {
    expect(visualState(tree, new Set([0, 1]), 0, 2)).toBe('canAllocate');
  });
  it('is unallocated for a node not adjacent to the allocated set', () => {
    expect(visualState(tree, new Set([0]), 0, 2)).toBe('unallocated');
  });
  it('is not canAllocate for a neighbour that is blocked', () => {
    expect(visualState(tree, new Set([0, 1]), 0, 2, new Set([2]))).toBe('unallocated');
  });
});
