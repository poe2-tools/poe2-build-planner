import { describe, it, expect } from 'vitest';
import type { TreeData, TreeNode } from '../tree/types';
import { ascendancyLayout, hitAscendancy } from './ascendancy';

function node(skill: number, x: number, y: number): TreeNode {
  return {
    skill, id: `a${skill}`, name: `a${skill}`, icon: 'x.png', stats: [], x, y,
    group: 0, orbit: 0, orbitIndex: 0, inNodes: [], outNodes: [], ascendancyId: 'Test1',
  };
}

// 3 nodes spanning a 100x100 world box (corners at 0,0 / 100,0 / 0,100).
function tree(): TreeData {
  const nodes = [node(1, 0, 0), node(2, 100, 0), node(3, 0, 100)];
  return {
    nodesBySkill: new Map(nodes.map((n) => [n.skill, n])),
    nodesById: new Map(), adjacency: new Map(), classes: [], classStartNodes: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    mainSkills: [], groups: new Map(),
    ascendancySkills: new Map([['Test1', [1, 2, 3]]]),
  };
}

describe('ascendancyLayout', () => {
  it('returns null for an unknown / inactive ascendancy', () => {
    expect(ascendancyLayout(tree(), 'Nope')).toBeNull();
  });

  it('centres the cluster on the world hub (0,0) and encloses every node', () => {
    const layout = ascendancyLayout(tree(), 'Test1')!;
    expect(layout.cx).toBe(0);
    expect(layout.cy).toBe(0);
    expect(layout.radius).toBeGreaterThan(0);
    for (const n of layout.nodes) {
      expect(Math.hypot(n.wx, n.wy) + n.wr).toBeLessThanOrEqual(layout.radius + 1e-6);
    }
  });

  it('preserves aspect (uniform scale) and maps the bbox centre to the world origin', () => {
    const layout = ascendancyLayout(tree(), 'Test1')!;
    const n1 = layout.bySkill.get(1)!; // world (0,0)
    const n2 = layout.bySkill.get(2)!; // world (100,0)
    const n3 = layout.bySkill.get(3)!; // world (0,100)
    // equal world spans (100) map to equal scaled spans
    expect(Math.abs(n2.wx - n1.wx)).toBeCloseTo(Math.abs(n3.wy - n1.wy), 6);
    // bbox centre (50,50) lands at the origin
    expect((n1.wx + n2.wx) / 2).toBeCloseTo(0, 6);
    expect((n1.wy + n3.wy) / 2).toBeCloseTo(0, 6);
  });

  it('sizes the background square larger than the node disc', () => {
    const layout = ascendancyLayout(tree(), 'Test1')!;
    expect(layout.bgSize).toBeGreaterThan(layout.radius * 2);
  });
});

describe('hitAscendancy', () => {
  it('round-trips a node world position back to its skill', () => {
    const layout = ascendancyLayout(tree(), 'Test1')!;
    const n2 = layout.bySkill.get(2)!;
    expect(hitAscendancy(layout, n2.wx, n2.wy, 1)).toBe(2);
  });

  it('returns null when no node is near the point', () => {
    const layout = ascendancyLayout(tree(), 'Test1')!;
    // far outside the cluster, well beyond any node radius
    expect(hitAscendancy(layout, 1e6, 1e6, 1)).toBeNull();
  });
});
