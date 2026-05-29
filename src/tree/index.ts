export * from './types';
export { indexTree, nodeKind, classIndexForAscendancy, classStartNode } from './data';
export {
  shortestPathFromAny,
  isAdjacentToAllocated,
  allocate,
  deallocate,
  pointsUsed,
} from './allocation';
export type { PointTotals } from './allocation';
