export interface TreeNode {
  skill: number;
  id: string | null;
  name: string;
  icon?: string;
  stats: string[];
  x: number;
  y: number;
  group: number;
  orbit: number;
  orbitIndex: number;
  inNodes: number[];
  outNodes: number[];
  isNotable?: boolean;
  isKeystone?: boolean;
  isMastery?: boolean;
  isJewelSocket?: boolean;
  isAscendancyStart?: boolean;
  ascendancyId?: string;
  classStartIndex?: number[];
  isMultipleChoiceOption?: boolean;
  multipleChoiceParent?: number;
}

export type NodeKind =
  | 'classStart'
  | 'ascendancyStart'
  | 'keystone'
  | 'notable'
  | 'mastery'
  | 'jewel'
  | 'small';

export type GroupMap = Map<number, { x: number; y: number }>;

export interface Ascendancy {
  id: string;
  name: string;
}

export interface TreeClass {
  name: string;
  base_str: number;
  base_dex: number;
  base_int: number;
  ascendancies: Ascendancy[];
}

export interface TreeData {
  nodesBySkill: Map<number, TreeNode>;
  nodesById: Map<string, TreeNode>;
  adjacency: Map<number, number[]>;
  /** Allocation-only graph: spurious cross-class / ascendancy-bridge edges removed. */
  navAdjacency?: Map<number, number[]>;
  classes: TreeClass[];
  classStartNodes: TreeNode[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Renderable main-tree skills: not decoration AND no ascendancyId. Drives the spatial index. */
  mainSkills: number[];
  /** ascendancyId -> its non-decoration node skills (active ascendancies only). */
  ascendancySkills: Map<string, number[]>;
  /** group id -> orbit centre, used for arc geometry. */
  groups: GroupMap;
}
