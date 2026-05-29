import type { TreeData } from '../tree/types';
import { isAdjacentToAllocated } from '../tree/allocation';
import type { VisualState } from '../tree/source';

export function visualState(
  tree: TreeData,
  allocated: Set<number>,
  start: number,
  skill: number,
  blocked: Set<number> = new Set(),
): VisualState {
  if (allocated.has(skill)) return 'allocated';
  if (isAdjacentToAllocated(tree, allocated, start, skill, blocked)) return 'canAllocate';
  return 'unallocated';
}
