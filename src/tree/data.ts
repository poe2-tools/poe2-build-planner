import type { TreeData, TreeNode, TreeClass, NodeKind, GroupMap } from './types';

interface RawNode {
  id?: string | null;
  name?: string;
  icon?: string;
  stats?: string[];
  x?: number;
  y?: number;
  group?: number;
  orbit?: number;
  orbitIndex?: number;
  in?: string[];
  out?: string[];
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

export function indexTree(raw: any): TreeData {
  const nodesBySkill = new Map<number, TreeNode>();
  const nodesById = new Map<string, TreeNode>();

  for (const [key, rawNode] of Object.entries<RawNode>(raw.nodes)) {
    const n = rawNode;
    const node: TreeNode = {
      skill: Number(key),
      id: n.id ?? null,
      name: n.name ?? '',
      icon: n.icon,
      stats: n.stats ?? [],
      x: n.x ?? 0,
      y: n.y ?? 0,
      group: n.group ?? 0,
      orbit: n.orbit ?? 0,
      orbitIndex: n.orbitIndex ?? 0,
      inNodes: (n.in ?? []).map(Number),
      outNodes: (n.out ?? []).map(Number),
      isNotable: n.isNotable,
      isKeystone: n.isKeystone,
      isMastery: n.isMastery,
      isJewelSocket: n.isJewelSocket,
      isAscendancyStart: n.isAscendancyStart,
      ascendancyId: n.ascendancyId,
      classStartIndex: n.classStartIndex,
      isMultipleChoiceOption: n.isMultipleChoiceOption,
      multipleChoiceParent: n.multipleChoiceParent,
    };
    nodesBySkill.set(node.skill, node);
    if (node.id) nodesById.set(node.id, node);
  }

  const adjacency = new Map<number, number[]>();
  for (const node of nodesBySkill.values()) {
    const set = new Set<number>([...node.inNodes, ...node.outNodes]);
    adjacency.set(node.skill, [...set]);
  }

  const groups: GroupMap = new Map();
  for (const [key, g] of Object.entries<{ x?: number; y?: number }>(raw.groups ?? {})) {
    groups.set(Number(key), { x: g.x ?? 0, y: g.y ?? 0 });
  }

  const mainSkills: number[] = [];
  const ascendancySkills = new Map<string, number[]>();
  for (const node of nodesBySkill.values()) {
    if (isDecoration(node)) continue;
    if (node.ascendancyId) {
      const list = ascendancySkills.get(node.ascendancyId);
      if (list) list.push(node.skill);
      else ascendancySkills.set(node.ascendancyId, [node.skill]);
    } else {
      mainSkills.push(node.skill);
    }
  }

  // Allocation graph: only navigable (non-decoration) nodes, navigable edges only.
  const navigable = new Set<number>();
  for (const node of nodesBySkill.values()) {
    if (!isDecoration(node)) navigable.add(node.skill);
  }
  const navAdjacency = new Map<number, number[]>();
  for (const skill of navigable) {
    const a = nodesBySkill.get(skill)!;
    const nbrs: number[] = [];
    for (const bSkill of new Set([...a.inNodes, ...a.outNodes])) {
      if (!navigable.has(bSkill)) continue;
      const b = nodesBySkill.get(bSkill)!;
      if (isNavigableEdge(a, b)) nbrs.push(bSkill);
    }
    navAdjacency.set(skill, nbrs);
  }

  const classStartNodes = [...nodesBySkill.values()].filter((n) => n.classStartIndex !== undefined);

  const classes: TreeClass[] = (raw.classes ?? []).map((c: any) => ({
    name: c.name,
    base_str: c.base_str,
    base_dex: c.base_dex,
    base_int: c.base_int,
    ascendancies: (c.ascendancies ?? [])
      .filter((a: any) => a.name)
      .map((a: any) => ({ id: a.id, name: a.name })),
  }));

  return {
    nodesBySkill,
    nodesById,
    adjacency,
    navAdjacency,
    classes,
    classStartNodes,
    bounds: { minX: raw.min_x, minY: raw.min_y, maxX: raw.max_x, maxY: raw.max_y },
    mainSkills,
    ascendancySkills,
    groups,
  };
}

/**
 * Decoration = masteries (decorative in this dataset), empty proxy nodes (no name, no icon),
 * or the disconnected SinisterJewelSockets. Decoration nodes neither render nor navigate.
 */
export function isDecoration(n: TreeNode): boolean {
  return !!n.isMastery || (!n.name && !n.icon) || n.name.includes('SinisterJewelSocket');
}

/**
 * An allocation edge is navigable iff both ends are on the main tree, both share one
 * ascendancy, or it is the canonical class-start <-> ascendancy-start bridge. This drops
 * spurious ascendancy->main edges.
 */
function isNavigableEdge(a: TreeNode, b: TreeNode): boolean {
  if (a.ascendancyId === undefined && b.ascendancyId === undefined) return true;
  if (a.ascendancyId && a.ascendancyId === b.ascendancyId) return true;
  return (
    (a.classStartIndex !== undefined && !!b.isAscendancyStart) ||
    (!!a.isAscendancyStart && b.classStartIndex !== undefined)
  );
}

/**
 * Nodes that allocation must not traverse for the current selection: every class-start
 * other than `selectedStart`, and every ascendancy skill not in `selectedAscendancy`
 * (all of them when no ascendancy is selected).
 */
export function blockedNodes(
  tree: TreeData,
  selectedStart: number | null,
  selectedAscendancy: string | undefined,
): Set<number> {
  const blocked = new Set<number>();
  for (const n of tree.classStartNodes) {
    if (n.skill !== selectedStart) blocked.add(n.skill);
  }
  for (const [ascId, skills] of tree.ascendancySkills) {
    if (ascId === selectedAscendancy) continue;
    for (const s of skills) blocked.add(s);
  }
  return blocked;
}

/**
 * The other multiple-choice option skills sharing this node's `multipleChoiceParent`.
 * Empty unless `skill` is itself a multiple-choice option.
 */
export function siblingChoices(tree: TreeData, skill: number): number[] {
  const n = tree.nodesBySkill.get(skill);
  if (!n?.isMultipleChoiceOption || n.multipleChoiceParent === undefined) return [];
  const parent = n.multipleChoiceParent;
  const out: number[] = [];
  for (const other of tree.nodesBySkill.values()) {
    if (other.skill !== skill && other.isMultipleChoiceOption && other.multipleChoiceParent === parent) {
      out.push(other.skill);
    }
  }
  return out;
}

export function nodeKind(n: TreeNode): NodeKind {
  if (n.classStartIndex !== undefined) return 'classStart';
  if (n.isAscendancyStart) return 'ascendancyStart';
  if (n.isKeystone) return 'keystone';
  if (n.isMastery) return 'mastery';
  if (n.isJewelSocket) return 'jewel';
  if (n.isNotable) return 'notable';
  return 'small';
}

/** Base class index for an ascendancy id like "Ranger1"; -1 if not found. */
export function classIndexForAscendancy(tree: TreeData, ascendancy: string): number {
  return tree.classes.findIndex((c) => c.ascendancies.some((a) => a.id === ascendancy));
}

/** The (shared) class-start node for a base class index. */
export function classStartNode(tree: TreeData, classIndex: number): TreeNode | undefined {
  return tree.classStartNodes.find((n) => n.classStartIndex?.includes(classIndex));
}
