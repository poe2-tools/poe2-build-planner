import { describe, it, expect } from 'vitest';
import { lodFor, NODE_WORLD_RADIUS } from './lod';

describe('lodFor', () => {
  it('draws dots when zoomed far out', () => {
    expect(lodFor(0.02)).toBe('dots');
  });
  it('draws frames at medium zoom', () => {
    expect(lodFor(0.1)).toBe('icons');
  });
  it('draws frames and icons when zoomed in', () => {
    expect(lodFor(0.3)).toBe('full');
  });
});

describe('NODE_WORLD_RADIUS', () => {
  it('exposes a per-kind base radius in world units', () => {
    expect(NODE_WORLD_RADIUS.keystone).toBeGreaterThan(NODE_WORLD_RADIUS.small);
  });
});
