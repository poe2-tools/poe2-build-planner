import type { Build, Passive, SkillSetup, Item, LevelInterval } from '../buildfile';
import type { TreeData } from '../tree/types';

export type Domain = 'passives' | 'skills' | 'items';

/** Weapon-set tag: 0 = Shared/untagged, 1 = set 1, 2 = set 2. */
export type WeaponSet = 0 | 1 | 2;

export const DEFAULT_ID = 'default';

export interface RangeBase {
  id: string;
  interval: LevelInterval | null; // null = default range (omit level_interval on export)
  isDefault: boolean;
}

export interface PassiveRange extends RangeBase {
  allocated: Set<number>;          // skill numbers; includes the class-start node
  entries: Map<number, Passive>;   // per-node .build data, level_interval stripped (range-owned)
}
export interface SkillRange extends RangeBase {
  skills: SkillSetup[];            // level_interval stripped (range-owned); supports keep theirs
}
export interface ItemRange extends RangeBase {
  items: Item[];                   // level_interval stripped (range-owned)
}

export type AnyRange = PassiveRange | SkillRange | ItemRange;

let rangeSeq = 0;
export function nextRangeId(): string {
  return `r${++rangeSeq}`;
}

/** Group key for an interval. Absent / [0,100] / [1,100] all fold to the default range. */
export function intervalKey(iv: LevelInterval | null | undefined): string {
  if (!iv) return 'default';
  const [a, b] = iv;
  if ((a === 0 || a === 1) && b === 100) return 'default';
  return `${a}-${b}`;
}

export function intervalLabel(iv: LevelInterval | null): string {
  return iv ? `${iv[0]}–${iv[1]}` : 'Default';
}

/** Human label for a range: default shows its implicit 1-100 span. */
export function rangeLabel(r: RangeBase): string {
  return r.isDefault ? 'Default (1-100)' : `${r.interval![0]}–${r.interval![1]}`;
}

/** Default first, then ascending by `from`, ties by `to`. */
export function compareRanges(a: RangeBase, b: RangeBase): number {
  if (a.isDefault) return b.isDefault ? 0 : -1;
  if (b.isDefault) return 1;
  return a.interval![0] - b.interval![0] || a.interval![1] - b.interval![1];
}

function stripInterval<T extends { level_interval?: LevelInterval }>(o: T): T {
  const next = { ...o };
  delete next.level_interval;
  return next;
}

function withRangeInterval<T extends { level_interval?: LevelInterval }>(o: T, interval: LevelInterval | null): T {
  const next = { ...o };
  if (interval) next.level_interval = interval;
  else delete next.level_interval;
  return next;
}

type RangeMap<T extends RangeBase> = Map<string, T>;

function ensureRange<T extends RangeBase>(
  groups: RangeMap<T>,
  iv: LevelInterval | null,
  make: (id: string, interval: LevelInterval | null, isDefault: boolean) => T,
): T {
  const key = intervalKey(iv);
  let r = groups.get(key);
  if (!r) {
    const isDefault = key === 'default';
    r = make(isDefault ? DEFAULT_ID : nextRangeId(), isDefault ? null : iv, isDefault);
    groups.set(key, r);
  }
  return r;
}

export function buildToRanges(
  build: Build,
  tree: TreeData,
  startSkill: number | null,
): { passiveRanges: PassiveRange[]; skillRanges: SkillRange[]; itemRanges: ItemRange[] } {
  // passives
  const pg: RangeMap<PassiveRange> = new Map();
  for (const p of build.passives) {
    const r = ensureRange(pg, p.level_interval ?? null, (id, interval, isDefault) => ({
      id, interval, isDefault, allocated: new Set<number>(), entries: new Map<number, Passive>(),
    }));
    const node = tree.nodesById.get(p.id);
    if (!node) continue;
    r.allocated.add(node.skill);
    r.entries.set(node.skill, stripInterval(p));
  }
  ensureRange(pg, null, (id, interval, isDefault) => ({
    id, interval, isDefault, allocated: new Set<number>(), entries: new Map<number, Passive>(),
  }));
  if (startSkill !== null) for (const r of pg.values()) r.allocated.add(startSkill);

  // skills
  const sg: RangeMap<SkillRange> = new Map();
  for (const sk of build.skills) {
    ensureRange(sg, sk.level_interval ?? null, (id, interval, isDefault) => ({
      id, interval, isDefault, skills: [],
    })).skills.push(stripInterval(sk));
  }
  ensureRange(sg, null, (id, interval, isDefault) => ({ id, interval, isDefault, skills: [] }));

  // items
  const ig: RangeMap<ItemRange> = new Map();
  for (const it of build.items) {
    ensureRange(ig, it.level_interval ?? null, (id, interval, isDefault) => ({
      id, interval, isDefault, items: [],
    })).items.push(stripInterval(it));
  }
  ensureRange(ig, null, (id, interval, isDefault) => ({ id, interval, isDefault, items: [] }));

  return {
    passiveRanges: [...pg.values()].sort(compareRanges),
    skillRanges: [...sg.values()].sort(compareRanges),
    itemRanges: [...ig.values()].sort(compareRanges),
  };
}

export function rangesToBuild(
  build: Build,
  passiveRanges: PassiveRange[],
  skillRanges: SkillRange[],
  itemRanges: ItemRange[],
  tree: TreeData,
  startSkill: number | null,
): Build {
  const passives: Passive[] = [];
  for (const r of [...passiveRanges].sort(compareRanges)) {
    for (const skill of r.allocated) {
      if (skill === startSkill) continue;
      const node = tree.nodesBySkill.get(skill);
      if (!node?.id) continue;
      const base = r.entries.get(skill) ?? ({ id: node.id } as Passive);
      passives.push(withRangeInterval(base, r.interval));
    }
  }
  const skills: SkillSetup[] = [];
  for (const r of [...skillRanges].sort(compareRanges)) for (const sk of r.skills) skills.push(withRangeInterval(sk, r.interval));
  const items: Item[] = [];
  for (const r of [...itemRanges].sort(compareRanges)) for (const it of r.items) items.push(withRangeInterval(it, r.interval));
  return { ...build, passives, skills, items };
}

/** Allocated nodes whose weapon_set tag is the *other* set; empty when viewing Shared (0). */
export function dimmedByWeaponSet(range: PassiveRange | undefined, activeWeaponSet: number): Set<number> {
  const out = new Set<number>();
  if (!range || activeWeaponSet === 0) return out;
  for (const skill of range.allocated) {
    const ws = range.entries.get(skill)?.weapon_set;
    if (ws !== undefined && ws !== activeWeaponSet) out.add(skill);
  }
  return out;
}
