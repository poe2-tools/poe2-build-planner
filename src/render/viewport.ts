export interface Viewport { x: number; y: number; zoom: number }
export interface Size { width: number; height: number }
export interface WorldRect { minX: number; minY: number; maxX: number; maxY: number }

export function worldToScreen(vp: Viewport, size: Size, wx: number, wy: number): { sx: number; sy: number } {
  return {
    sx: size.width / 2 + (wx - vp.x) * vp.zoom,
    sy: size.height / 2 + (wy - vp.y) * vp.zoom,
  };
}

export function screenToWorld(vp: Viewport, size: Size, sx: number, sy: number): { wx: number; wy: number } {
  return {
    wx: vp.x + (sx - size.width / 2) / vp.zoom,
    wy: vp.y + (sy - size.height / 2) / vp.zoom,
  };
}

export function visibleWorldRect(vp: Viewport, size: Size): WorldRect {
  const halfW = size.width / 2 / vp.zoom;
  const halfH = size.height / 2 / vp.zoom;
  return { minX: vp.x - halfW, minY: vp.y - halfH, maxX: vp.x + halfW, maxY: vp.y + halfH };
}

/** Centre `bounds` in the canvas and zoom so it fits, leaving `margin` px of padding. */
export function fitToBounds(bounds: WorldRect, size: Size, margin = 40): Viewport {
  const worldW = Math.max(1, bounds.maxX - bounds.minX);
  const worldH = Math.max(1, bounds.maxY - bounds.minY);
  const zoom = Math.min((size.width - margin * 2) / worldW, (size.height - margin * 2) / worldH);
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2, zoom };
}
