import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  indexTree,
  nodeKind,
  classIndexForAscendancy,
  classStartNode,
  isDecoration,
  blockedNodes,
  siblingChoices,
} from './data';
import type { TreeData } from './types';

let tree: TreeData;

beforeAll(() => {
  const raw = JSON.parse(readFileSync('Skill Trees/0.5.2/data.json', 'utf8'));
  tree = indexTree(raw);
});

describe('indexTree', () => {
  it('indexes all nodes and classes', () => {
    expect(tree.nodesBySkill.size).toBe(5151);
    expect(tree.classes.length).toBe(12);
    expect(tree.classStartNodes.length).toBe(6);
  });

  it('drops no-name ascendancies but keeps the named ones (and all 12 classes)', () => {
    const ranger = tree.classes[2];
    const druid = tree.classes[11];
    const rangerIds = ranger.ascendancies.map((a) => a.id);
    expect(rangerIds).toContain('Ranger1');
    expect(rangerIds).toContain('Ranger3');
    expect(rangerIds).not.toContain('Ranger2'); // name was null
    expect(druid.ascendancies.map((a) => a.id)).not.toContain('Druid3'); // name was null
    expect(tree.classes.length).toBe(12);
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
  it('is true for SinisterJewelSocket nodes (disconnected, excluded from mainSkills)', () => {
    const sinister = tree.nodesById.get('voices_jewel_slot1')!;
    expect(sinister.name).toContain('SinisterJewelSocket');
    expect(isDecoration(sinister)).toBe(true);
    expect(tree.mainSkills.includes(sinister.skill)).toBe(false);
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
    expect(tree.mainSkills.length).toBe(4110); // 4115 minus the 5 SinisterJewelSockets
  });
  it('ascendancySkills groups active ascendancies and includes their start node', () => {
    expect(tree.ascendancySkills.size).toBe(22);
    expect(tree.ascendancySkills.get('Ranger1')!.length).toBe(19);
    expect(tree.ascendancySkills.get('Ranger1')).toContain(46990); // AscendancyRanger1Start
  });
  it('groups maps group ids to orbit centres', () => {
    expect(tree.groups.size).toBe(1621);
    const g3 = tree.groups.get(3)!;
    expect(g3.x).toBeCloseTo(-22257, 0);
    expect(g3.y).toBeCloseTo(-6513.5, 1);
  });
});

describe('navAdjacency', () => {
  it('is built for navigable nodes only (no decoration)', () => {
    expect(tree.navAdjacency).toBeDefined();
    const sinister = tree.nodesById.get('voices_jewel_slot1')!;
    expect(tree.navAdjacency!.has(sinister.skill)).toBe(false);
    const proj = tree.nodesById.get('projectiles15')!;
    expect(tree.navAdjacency!.has(proj.skill)).toBe(true);
  });

  it('drops spurious ascendancy->main bridges', () => {
    // "Path of the Sorceress" (12795, asc node) edges to main nodes 44871/4739 in the
    // full adjacency but must NOT be navigable.
    const nav = tree.navAdjacency!.get(12795) ?? [];
    expect(nav).not.toContain(44871);
    expect(nav).not.toContain(4739);
    // ...while the raw adjacency does carry them.
    expect(tree.adjacency.get(12795)).toEqual(expect.arrayContaining([44871, 4739]));
  });

  it('keeps the canonical class-start <-> ascendancy-start bridge', () => {
    const start = classStartNode(tree, 2)!; // Ranger class start
    const ascStart = tree.nodesBySkill.get(46990)!; // AscendancyRanger1Start
    // they are connected in the raw adjacency
    expect(tree.adjacency.get(start.skill)).toContain(ascStart.skill);
    // and the bridge survives in navAdjacency (both directions)
    expect(tree.navAdjacency!.get(start.skill)).toContain(ascStart.skill);
    expect(tree.navAdjacency!.get(ascStart.skill)).toContain(start.skill);
  });
});

describe('blockedNodes', () => {
  it('blocks every class start except the selected one', () => {
    const ranger = classStartNode(tree, 2)!;
    const blocked = blockedNodes(tree, ranger.skill, 'Ranger1');
    expect(blocked.has(ranger.skill)).toBe(false);
    const others = tree.classStartNodes.filter((n) => n.skill !== ranger.skill);
    for (const o of others) expect(blocked.has(o.skill)).toBe(true);
  });

  it('blocks ascendancy skills not in the selected ascendancy', () => {
    const ranger = classStartNode(tree, 2)!;
    const blocked = blockedNodes(tree, ranger.skill, 'Ranger1');
    // a Ranger1 ascendancy node is NOT blocked
    expect(blocked.has(46990)).toBe(false); // AscendancyRanger1Start
    // a Ranger3 ascendancy node IS blocked
    expect(blocked.has(57141)).toBe(true); // Brew Concoction (Ranger3)
  });

  it('blocks ALL ascendancy skills when no ascendancy is selected', () => {
    const ranger = classStartNode(tree, 2)!;
    const blocked = blockedNodes(tree, ranger.skill, undefined);
    for (const skills of tree.ascendancySkills.values()) {
      for (const s of skills) expect(blocked.has(s)).toBe(true);
    }
  });
});

describe('siblingChoices', () => {
  it('returns the other options sharing a multipleChoiceParent', () => {
    const sibs = siblingChoices(tree, 9710); // Bleeding Concoction, parent 57141
    expect(sibs.sort((a, b) => a - b)).toEqual([18940, 38004, 56618, 58379]);
    expect(sibs).not.toContain(9710); // excludes itself
  });

  it('returns [] for a non-option node', () => {
    expect(siblingChoices(tree, tree.nodesById.get('projectiles15')!.skill)).toEqual([]);
  });
});
