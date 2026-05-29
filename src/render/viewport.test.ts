import { describe, it, expect } from 'vitest';
import { worldToScreen, screenToWorld, visibleWorldRect, fitToBounds } from './viewport';

const vp = { x: 100, y: 200, zoom: 2 };
const size = { width: 800, height: 600 };

describe('viewport transforms', () => {
  it('maps the viewport centre to the canvas centre', () => {
    expect(worldToScreen(vp, size, 100, 200)).toEqual({ sx: 400, sy: 300 });
  });
  it('offsets by world delta scaled by zoom', () => {
    expect(worldToScreen(vp, size, 110, 200)).toEqual({ sx: 420, sy: 300 });
  });
  it('round-trips screen <-> world', () => {
    const w = screenToWorld(vp, size, 420, 300);
    expect(w.wx).toBeCloseTo(110);
    expect(w.wy).toBeCloseTo(200);
  });
  it('computes the visible world rectangle', () => {
    const r = visibleWorldRect(vp, size);
    expect(r).toEqual({ minX: 100 - 200, minY: 200 - 150, maxX: 100 + 200, maxY: 200 + 150 });
  });
});

describe('fitToBounds', () => {
  it('centres the bounds and zooms to fit with margin', () => {
    const fit = fitToBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 500 }, size, 0);
    expect(fit.x).toBe(500);
    expect(fit.y).toBe(250);
    // limiting axis is width: 800/1000 = 0.8
    expect(fit.zoom).toBeCloseTo(0.8);
  });
});
