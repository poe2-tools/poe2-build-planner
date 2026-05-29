import type { NodeKind } from '../tree/types';

export type Lod = 'dots' | 'icons' | 'full';

/** Choose detail by zoom (screen px per world unit). Tuned in the browser. */
export function lodFor(zoom: number): Lod {
  if (zoom < 0.05) return 'dots';
  if (zoom < 0.18) return 'icons';
  return 'full';
}

/** Base node radius in world units, by kind. */
export const NODE_WORLD_RADIUS: Record<NodeKind, number> = {
  small: 27,
  notable: 40,
  keystone: 54,
  mastery: 40,
  jewel: 35,
  ascendancyStart: 35,
  classStart: 35,
};
