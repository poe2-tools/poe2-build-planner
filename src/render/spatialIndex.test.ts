import { describe, it, expect } from 'vitest';
import type { TreeData, TreeNode } from '../tree/types';
import { buildSpatialIndex, queryRect, nodeAt } from './spatialIndex';

function node(skill: number, x: number, y: number): TreeNode {
  return {
    skill, id: `n${skill}`, name: `n${skill}`, stats: [], x, y,
    group: 0, orbit: 0, orbitIndex: 0, inNodes: [], outNodes: [],
  };
}

function tree(nodes: TreeNode[]): TreeData {
  return {
    nodesBySkill: new Map(nodes.map((n) => [n.skill, n])),
    nodesById: new Map(), adjacency: new Map(), classes: [], classStartNodes: [],
    bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
    mainSkills: nodes.map((n) => n.skill), ascendancySkills: new Map(), groups: new Map(),
  };
}

const t = tree([node(1, 0, 0), node(2, 100, 100), node(3, 900, 900)]);

describe('queryRect', () => {
  it('returns only nodes whose cells overlap the rectangle', () => {
    const index = buildSpatialIndex(t, 100);
    const hits = queryRect(index, { minX: -10, minY: -10, maxX: 150, maxY: 150 }).sort();
    expect(hits).toEqual([1, 2]);
  });
  it('excludes far-away nodes', () => {
    const index = buildSpatialIndex(t, 100);
    expect(queryRect(index, { minX: -10, minY: -10, maxX: 50, maxY: 50 })).toEqual([1]);
  });
});

describe('nodeAt', () => {
  it('returns the nearest node within the radius', () => {
    const index = buildSpatialIndex(t, 100);
    expect(nodeAt(index, t, 5, 5, 30)).toBe(1);
  });
  it('returns null when nothing is within the radius', () => {
    const index = buildSpatialIndex(t, 100);
    expect(nodeAt(index, t, 500, 500, 30)).toBeNull();
  });
});

describe('mainSkills gating', () => {
  it('does not index a node that is absent from mainSkills', () => {
    const hidden = node(99, 0, 0);                 // co-located with node 1
    const t2: TreeData = {
      ...tree([node(1, 0, 0), node(2, 100, 100), hidden]),
      mainSkills: [1, 2],                           // 99 deliberately excluded
    };
    const index = buildSpatialIndex(t2, 100);
    const hits = queryRect(index, { minX: -10, minY: -10, maxX: 10, maxY: 10 });
    expect(hits).toEqual([1]);                      // 99 not returned despite same cell
    expect(nodeAt(index, t2, 0, 0, 30)).toBe(1);    // never resolves to 99
  });
});
