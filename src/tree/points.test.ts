import { describe, it, expect } from 'vitest';
import type { TreeData, TreeNode } from './types';
import { pointsUsed } from './allocation';

function node(skill: number, partial: Partial<TreeNode> = {}): TreeNode {
  return {
    skill, id: `n${skill}`, name: `n${skill}`, stats: [], x: 0, y: 0,
    group: 0, orbit: 0, orbitIndex: 0, inNodes: [], outNodes: [], ...partial,
  };
}

function tree(nodes: TreeNode[]): TreeData {
  const nodesBySkill = new Map(nodes.map((n) => [n.skill, n]));
  return {
    nodesBySkill, nodesById: new Map(), adjacency: new Map(), classes: [],
    classStartNodes: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    mainSkills: nodes.map((n) => n.skill), ascendancySkills: new Map(), groups: new Map(),
  };
}

describe('pointsUsed', () => {
  it('excludes the class start and counts the rest as main points', () => {
    const t = tree([node(0, { classStartIndex: [0] }), node(1), node(2), node(3)]);
    expect(pointsUsed(t, new Set([0, 1, 2, 3]))).toEqual({ main: 3, ascendancy: 0 });
  });

  it('separates ascendancy points and excludes the ascendancy start', () => {
    const t = tree([
      node(0, { classStartIndex: [0] }),
      node(1),
      node(10, { ascendancyId: 'Ranger1', isAscendancyStart: true }),
      node(11, { ascendancyId: 'Ranger1' }),
      node(12, { ascendancyId: 'Ranger1' }),
    ]);
    expect(pointsUsed(t, new Set([0, 1, 10, 11, 12]))).toEqual({ main: 1, ascendancy: 2 });
  });

  it('does not count multiple-choice option nodes (the point is spent on the parent)', () => {
    const t = tree([
      node(0, { classStartIndex: [0] }),
      node(10, { ascendancyId: 'Ranger3', isAscendancyStart: true }),
      node(20, { ascendancyId: 'Ranger3' }), // parent notable: counts
      node(21, { ascendancyId: 'Ranger3', isMultipleChoiceOption: true, multipleChoiceParent: 20 }),
    ]);
    expect(pointsUsed(t, new Set([0, 10, 20, 21]))).toEqual({ main: 0, ascendancy: 1 });
  });
});
