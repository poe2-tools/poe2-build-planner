import { describe, it, expect } from 'vitest';
import type { TreeNode, GroupMap } from '../tree/types';
import { edgeGeometry } from './arc';

function node(skill: number, x: number, y: number, partial: Partial<TreeNode> = {}): TreeNode {
  return {
    skill, id: `n${skill}`, name: `n${skill}`, stats: [], x, y,
    group: 1, orbit: 1, orbitIndex: 0, inNodes: [], outNodes: [], ...partial,
  };
}

const groups: GroupMap = new Map([[1, { x: 0, y: 0 }]]);

describe('edgeGeometry', () => {
  it('returns an arc for a same-group, same-orbit edge', () => {
    const a = node(1, 100, 0);   // angle 0
    const b = node(2, 0, 100);   // angle +90deg
    const geom = edgeGeometry(a, b, groups);
    expect(geom.kind).toBe('arc');
    if (geom.kind !== 'arc') throw new Error('expected arc');
    expect(geom.cx).toBe(0);
    expect(geom.cy).toBe(0);
    expect(geom.r).toBeCloseTo(100, 6);          // equal radius from both endpoints
    expect(geom.a0).toBeCloseTo(0, 6);
    expect(geom.a1).toBeCloseTo(Math.PI / 2, 6);
    expect(geom.anticlockwise).toBe(false);       // +pi/2 delta is the minor arc, clockwise sense
  });

  it('chooses anticlockwise for a negative angular delta', () => {
    const a = node(1, 100, 0);   // angle 0
    const b = node(2, 0, -100);  // angle -90deg
    const geom = edgeGeometry(a, b, groups);
    if (geom.kind !== 'arc') throw new Error('expected arc');
    expect(geom.anticlockwise).toBe(true);
  });

  it('returns a line for a different-group edge', () => {
    const a = node(1, 100, 0, { group: 1 });
    const b = node(2, 0, 100, { group: 2 });
    expect(edgeGeometry(a, b, groups).kind).toBe('line');
  });

  it('returns a line for orbit 0', () => {
    const a = node(1, 100, 0, { orbit: 0 });
    const b = node(2, 0, 100, { orbit: 0 });
    expect(edgeGeometry(a, b, groups).kind).toBe('line');
  });

  it('returns a line when the group centre is unknown', () => {
    const a = node(1, 100, 0, { group: 7 });
    const b = node(2, 0, 100, { group: 7 });
    expect(edgeGeometry(a, b, groups).kind).toBe('line');
  });

  it('matches a real same-orbit tree edge (equal radii ~839)', () => {
    const g: GroupMap = new Map([[3, { x: -22257, y: -6513.5 }]]);
    const a = node(41311, -22983.6, -6094, { group: 3, orbit: 6 });
    const b = node(63633, -22676.5, -5786.9, { group: 3, orbit: 6 });
    const geom = edgeGeometry(a, b, g);
    if (geom.kind !== 'arc') throw new Error('expected arc');
    expect(geom.r).toBeCloseTo(839, 0);
  });
});
