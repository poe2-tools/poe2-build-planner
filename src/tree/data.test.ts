import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { indexTree, nodeKind, classIndexForAscendancy, classStartNode, isDecoration } from './data';
import type { TreeData } from './types';

let tree: TreeData;

beforeAll(() => {
  const raw = JSON.parse(readFileSync('Skill Trees/0.5.0/data.json', 'utf8'));
  tree = indexTree(raw);
});

describe('indexTree', () => {
  it('indexes all nodes and classes', () => {
    expect(tree.nodesBySkill.size).toBe(5102);
    expect(tree.classes.length).toBe(12);
    expect(tree.classStartNodes.length).toBe(6);
  });

  it('builds nodesById for nodes that have a string id', () => {
    expect(tree.nodesById.get('projectiles15')).toBeDefined();
  });

  it('resolves all passive ids in the sample build', () => {
    const build = JSON.parse(readFileSync('Builds/sample.build', 'utf8'));
    // passives may be bare strings or { id } objects
    const ids = (build.passives as (string | { id: string })[]).map((p) => (typeof p === 'string' ? p : p.id));
    const missing = ids.filter((id) => !tree.nodesById.has(id));
    expect(missing).toEqual([]);
  });

  it('converts in/out neighbours to numbers (undirected adjacency)', () => {
    const node = tree.nodesById.get('projectiles15')!;
    const neighbours = tree.adjacency.get(node.skill)!;
    expect(neighbours.every((n) => typeof n === 'number')).toBe(true);
    expect(neighbours.length).toBeGreaterThan(0);
  });
});

describe('class / ascendancy resolution', () => {
  it('maps an ascendancy id to its base class index', () => {
    expect(classIndexForAscendancy(tree, 'Ranger1')).toBe(2);
  });

  it('finds the shared class-start node for a class index', () => {
    expect(classStartNode(tree, 2)!.id).toBe('ranger596'); // Ranger
    expect(classStartNode(tree, 8)!.id).toBe('ranger596'); // Huntress shares it
  });
});

describe('nodeKind', () => {
  it('classifies a class-start node', () => {
    expect(nodeKind(tree.nodesById.get('ranger596')!)).toBe('classStart');
  });
});

describe('isDecoration', () => {
  it('is true for masteries (empty stats, reused notable frame)', () => {
    expect(isDecoration(tree.nodesBySkill.get(259)!)).toBe(true); // mastery_attack8
  });
  it('is true for empty proxy nodes (no name, no icon)', () => {
    expect(isDecoration(tree.nodesBySkill.get(429)!)).toBe(true);
  });
  it('is false for a normal node and a class-start node', () => {
    expect(isDecoration(tree.nodesById.get('projectiles15')!)).toBe(false);
    expect(isDecoration(tree.nodesById.get('ranger596')!)).toBe(false);
  });
});

describe('render sets', () => {
  it('mainSkills excludes decoration and ascendancy nodes', () => {
    const main = new Set(tree.mainSkills);
    expect(main.has(259)).toBe(false); // mastery
    expect(main.has(429)).toBe(false); // empty proxy
    expect(main.has(16)).toBe(false);  // ascendancy node (Ranger3)
    for (const s of tree.mainSkills) {
      const n = tree.nodesBySkill.get(s)!;
      expect(isDecoration(n)).toBe(false);
      expect(n.ascendancyId).toBeUndefined();
    }
  });
  it('mainSkills includes normal and class-start nodes', () => {
    const main = new Set(tree.mainSkills);
    expect(main.has(56651)).toBe(true); // projectiles15
    expect(main.has(tree.nodesById.get('ranger596')!.skill)).toBe(true);
  });
  it('mainSkills has the expected size', () => {
    expect(tree.mainSkills.length).toBe(4058);
  });
  it('ascendancySkills groups active ascendancies and includes their start node', () => {
    expect(tree.ascendancySkills.size).toBe(22);
    expect(tree.ascendancySkills.get('Ranger1')!.length).toBe(19);
    expect(tree.ascendancySkills.get('Ranger1')).toContain(46990); // AscendancyRanger1Start
  });
  it('groups maps group ids to orbit centres', () => {
    expect(tree.groups.size).toBe(1572);
    const g3 = tree.groups.get(3)!;
    expect(g3.x).toBeCloseTo(-22257, 0);
    expect(g3.y).toBeCloseTo(-6513.5, 1);
  });
});
