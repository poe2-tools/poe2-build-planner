import { create } from 'zustand';
import type { Build, Item, LevelInterval, SkillSetup } from '../buildfile';
import { serializeBuild } from '../buildfile';
import type { TreeData } from '../tree/types';
import { classIndexForAscendancy, classStartNode, blockedNodes, siblingChoices } from '../tree/data';
import { allocate, deallocate } from '../tree/allocation';
import type { Gem } from '../gems';
import type { Domain, WeaponSet, PassiveRange, SkillRange, ItemRange, AnyRange } from './ranges';
import { buildToRanges, rangesToBuild, nextRangeId, DEFAULT_ID } from './ranges';

interface State {
  tree: TreeData | null;
  build: Build; // meta + extra only; passives/skills/items are rebuilt from ranges on serialize
  classIndex: number;
  startSkill: number | null;
  blocked: Set<number>;
  dirty: boolean;
  gems: Map<string, Gem> | null;

  passiveRanges: PassiveRange[];
  skillRanges: SkillRange[];
  itemRanges: ItemRange[];
  activePassiveId: string;
  activeSkillId: string;
  activeItemId: string;
  activeWeaponSet: WeaponSet;

  reset: () => void;
  setTree: (tree: TreeData) => void;
  loadBuild: (build: Build) => void;
  clickNode: (skill: number) => void;
  setClass: (classIndex: number) => void;
  setAscendancy: (ascendancy: string) => void;
  setGems: (gems: Map<string, Gem>) => void;

  addRange: (domain: Domain) => void;
  duplicateRange: (domain: Domain, id: string) => void;
  deleteRange: (domain: Domain, id: string) => void;
  setRangeInterval: (domain: Domain, id: string, interval: LevelInterval | null) => void;
  setActiveRange: (domain: Domain, id: string) => void;
  setActiveWeaponSet: (ws: WeaponSet) => void;
  setNodeNote: (skill: number, text: string) => void;

  addSkillSetup: (gemId: string) => void;
  removeSkillSetup: (index: number) => void;
  moveSkillSetup: (index: number, dir: -1 | 1) => void;
  addSupport: (setupIndex: number, gemId: string) => void;
  removeSupport: (setupIndex: number, supportIndex: number) => void;
  setSupportInterval: (setupIndex: number, supportIndex: number, interval: LevelInterval | undefined) => void;
  setSkillText: (setupIndex: number, text: string, supportIndex?: number) => void;

  setItem: (inventoryId: string, fields: { additionalText?: string; uniqueName?: string; levelInterval?: LevelInterval }) => void;
  clearItem: (inventoryId: string) => void;

  setMeta: (meta: { name?: string; author?: string; description?: string }) => void;
  serialize: () => string;
}

const emptyBuild: Build = { name: '', passives: [], skills: [], items: [] };

function defaultPassiveRange(startSkill: number | null): PassiveRange {
  const allocated = new Set<number>();
  if (startSkill !== null) allocated.add(startSkill);
  return { id: DEFAULT_ID, interval: null, isDefault: true, allocated, entries: new Map() };
}
const defaultSkillRange = (): SkillRange => ({ id: DEFAULT_ID, interval: null, isDefault: true, skills: [] });
const defaultItemRange = (): ItemRange => ({ id: DEFAULT_ID, interval: null, isDefault: true, items: [] });

const NEW_INTERVAL: LevelInterval = [1, 10];

function emptyRange(domain: Domain, startSkill: number | null): AnyRange {
  const base = { id: nextRangeId(), interval: NEW_INTERVAL, isDefault: false };
  if (domain === 'passives') return { ...base, allocated: new Set(startSkill !== null ? [startSkill] : []), entries: new Map() };
  if (domain === 'skills') return { ...base, skills: [] };
  return { ...base, items: [] };
}

function cloneSetup(s: SkillSetup): SkillSetup {
  return {
    ...s,
    support_skills: s.support_skills?.map((sup) => ({ ...sup, extra: sup.extra ? { ...sup.extra } : undefined })),
    extra: s.extra ? { ...s.extra } : undefined,
  };
}

function cloneRange(domain: Domain, src: AnyRange): AnyRange {
  const base = { id: nextRangeId(), interval: src.interval ?? NEW_INTERVAL, isDefault: false };
  if (domain === 'passives') {
    const p = src as PassiveRange;
    return { ...base, allocated: new Set(p.allocated), entries: new Map([...p.entries].map(([k, v]) => [k, { ...v }])) };
  }
  if (domain === 'skills') return { ...base, skills: (src as SkillRange).skills.map(cloneSetup) };
  return { ...base, items: (src as ItemRange).items.map((x) => ({ ...x })) };
}

/** Dispatch a list+activeId transform to the right domain triple, returning a State patch. */
function onDomain(
  s: State,
  domain: Domain,
  fn: (list: AnyRange[], activeId: string) => { list: AnyRange[]; activeId: string },
): Partial<State> {
  if (domain === 'passives') {
    const { list, activeId } = fn(s.passiveRanges, s.activePassiveId);
    return { passiveRanges: list as PassiveRange[], activePassiveId: activeId };
  }
  if (domain === 'skills') {
    const { list, activeId } = fn(s.skillRanges, s.activeSkillId);
    return { skillRanges: list as SkillRange[], activeSkillId: activeId };
  }
  const { list, activeId } = fn(s.itemRanges, s.activeItemId);
  return { itemRanges: list as ItemRange[], activeItemId: activeId };
}

function updateActive<T extends { id: string }>(list: T[], activeId: string, fn: (r: T) => T): T[] {
  return list.map((r) => (r.id === activeId ? fn(r) : r));
}
function mapAt<T>(arr: T[], index: number, fn: (item: T) => T): T[] {
  return arr.map((item, i) => (i === index ? fn(item) : item));
}
function withInterval<T extends { level_interval?: LevelInterval }>(o: T, interval: LevelInterval | undefined): T {
  const next = { ...o };
  if (interval) next.level_interval = interval;
  else delete next.level_interval;
  return next;
}
function withText<T extends { additional_text?: string }>(o: T, text: string): T {
  const next = { ...o };
  if (text) next.additional_text = text;
  else delete next.additional_text;
  return next;
}

const initial = {
  tree: null as TreeData | null,
  build: emptyBuild,
  classIndex: -1,
  startSkill: null as number | null,
  blocked: new Set<number>(),
  dirty: false,
  gems: null as Map<string, Gem> | null,
  passiveRanges: [defaultPassiveRange(null)],
  skillRanges: [defaultSkillRange()],
  itemRanges: [defaultItemRange()],
  activePassiveId: DEFAULT_ID,
  activeSkillId: DEFAULT_ID,
  activeItemId: DEFAULT_ID,
  activeWeaponSet: 0 as WeaponSet,
};

export const useStore = create<State>((set, get) => ({
  ...initial,

  reset: () => set({ ...initial, blocked: new Set(), activeWeaponSet: 0, passiveRanges: [defaultPassiveRange(null)], skillRanges: [defaultSkillRange()], itemRanges: [defaultItemRange()] }),

  setTree: (tree) => set({ tree }),
  setGems: (gems) => set({ gems }),

  loadBuild: (build) => {
    const { tree } = get();
    if (!tree) return;
    const classIndex = build.ascendancy ? classIndexForAscendancy(tree, build.ascendancy) : -1;
    const start = classIndex >= 0 ? classStartNode(tree, classIndex) : undefined;
    const startSkill = start?.skill ?? null;
    const blocked = blockedNodes(tree, startSkill, build.ascendancy);
    const { passiveRanges, skillRanges, itemRanges } = buildToRanges(build, tree, startSkill);
    set({
      build,
      classIndex,
      startSkill,
      blocked,
      passiveRanges,
      skillRanges,
      itemRanges,
      activePassiveId: passiveRanges[0].id,
      activeSkillId: skillRanges[0].id,
      activeItemId: itemRanges[0].id,
      dirty: false,
    });
  },

  clickNode: (skill) => {
    const { tree, startSkill, blocked, passiveRanges, activePassiveId, activeWeaponSet } = get();
    if (!tree || startSkill === null) return;
    const range = passiveRanges.find((r) => r.id === activePassiveId);
    if (!range) return;
    const adding = !range.allocated.has(skill);
    let next = adding
      ? allocate(tree, range.allocated, startSkill, skill, blocked)
      : deallocate(tree, range.allocated, startSkill, skill, blocked);
    if (next === range.allocated) return;
    // Single choice: allocating a multiple-choice option removes any allocated sibling option.
    if (adding) {
      const sibs = siblingChoices(tree, skill).filter((s) => next.has(s));
      for (const sib of sibs) next = deallocate(tree, next, startSkill, sib, blocked);
    }
    const entries = new Map(range.entries);
    // Deallocation: drop entries for any node no longer allocated.
    for (const s of range.allocated) if (!next.has(s)) entries.delete(s);
    // Allocation: tag every newly-added node (the whole path) with the active set (skip Shared/0).
    if (adding && activeWeaponSet !== 0) {
      for (const s of next) {
        if (range.allocated.has(s) || s === startSkill) continue;
        const node = tree.nodesBySkill.get(s);
        if (node?.id) entries.set(s, { ...(entries.get(s) ?? { id: node.id }), weapon_set: activeWeaponSet });
      }
    }
    set({
      passiveRanges: updateActive(passiveRanges, activePassiveId, (r) => ({ ...r, allocated: next, entries })),
      dirty: true,
    });
  },

  setClass: (classIndex) => {
    const { tree, build } = get();
    if (!tree) return;
    const start = classStartNode(tree, classIndex);
    const startSkill = start?.skill ?? null;
    set({
      classIndex,
      startSkill,
      blocked: blockedNodes(tree, startSkill, undefined),
      passiveRanges: [defaultPassiveRange(startSkill)],
      activePassiveId: DEFAULT_ID,
      build: { ...build, ascendancy: undefined },
      dirty: true,
    });
  },

  setAscendancy: (ascendancy) =>
    set((s) => ({
      build: { ...s.build, ascendancy },
      blocked: s.tree ? blockedNodes(s.tree, s.startSkill, ascendancy) : s.blocked,
      dirty: true,
    })),

  addRange: (domain) =>
    set((s) => {
      const r = emptyRange(domain, s.startSkill);
      return { ...onDomain(s, domain, (list) => ({ list: [...list, r], activeId: r.id })), dirty: true };
    }),

  duplicateRange: (domain, id) =>
    set((s) => ({
      ...onDomain(s, domain, (list, a) => {
        const src = list.find((r) => r.id === id);
        if (!src) return { list, activeId: a };
        const copy = cloneRange(domain, src);
        return { list: [...list, copy], activeId: copy.id };
      }),
      dirty: true,
    })),

  deleteRange: (domain, id) =>
    set((s) => ({
      ...onDomain(s, domain, (list, a) => {
        const target = list.find((r) => r.id === id);
        if (!target || target.isDefault) return { list, activeId: a };
        const next = list.filter((r) => r.id !== id);
        const activeId = a === id ? next.find((r) => r.isDefault)?.id ?? next[0].id : a;
        return { list: next, activeId };
      }),
      dirty: true,
    })),

  setRangeInterval: (domain, id, interval) =>
    set((s) => ({
      ...onDomain(s, domain, (list, a) => ({
        list: list.map((r) => (r.id === id && !r.isDefault ? { ...r, interval } : r)),
        activeId: a,
      })),
      dirty: true,
    })),

  setActiveRange: (domain, id) => set((s) => onDomain(s, domain, (list) => ({ list, activeId: id }))),

  setActiveWeaponSet: (ws) => set({ activeWeaponSet: ws }),

  setNodeNote: (skill, text) =>
    set((s) => {
      const { tree } = s;
      const range = s.passiveRanges.find((r) => r.id === s.activePassiveId);
      if (!tree || !range || !range.allocated.has(skill)) return s;
      const node = tree.nodesBySkill.get(skill);
      if (!node?.id) return s;
      const entries = new Map(range.entries);
      entries.set(skill, withText(entries.get(skill) ?? { id: node.id }, text));
      return {
        passiveRanges: updateActive(s.passiveRanges, s.activePassiveId, (r) => ({ ...r, entries })),
        dirty: true,
      };
    }),

  addSkillSetup: (gemId) =>
    set((s) => ({
      skillRanges: updateActive(s.skillRanges, s.activeSkillId, (r) => ({ ...r, skills: [...r.skills, { id: gemId }] })),
      dirty: true,
    })),

  removeSkillSetup: (index) =>
    set((s) => ({
      skillRanges: updateActive(s.skillRanges, s.activeSkillId, (r) => ({ ...r, skills: r.skills.filter((_, i) => i !== index) })),
      dirty: true,
    })),

  moveSkillSetup: (index, dir) =>
    set((s) => ({
      skillRanges: updateActive(s.skillRanges, s.activeSkillId, (r) => {
        const j = index + dir;
        if (index < 0 || j < 0 || index >= r.skills.length || j >= r.skills.length) return r;
        const skills = [...r.skills];
        [skills[index], skills[j]] = [skills[j], skills[index]];
        return { ...r, skills };
      }),
      dirty: true,
    })),

  addSupport: (setupIndex, gemId) =>
    set((s) => ({
      skillRanges: updateActive(s.skillRanges, s.activeSkillId, (r) => ({
        ...r,
        skills: mapAt(r.skills, setupIndex, (su) => ({ ...su, support_skills: [...(su.support_skills ?? []), { id: gemId }] })),
      })),
      dirty: true,
    })),

  removeSupport: (setupIndex, supportIndex) =>
    set((s) => ({
      skillRanges: updateActive(s.skillRanges, s.activeSkillId, (r) => ({
        ...r,
        skills: mapAt(r.skills, setupIndex, (su) => ({ ...su, support_skills: (su.support_skills ?? []).filter((_, i) => i !== supportIndex) })),
      })),
      dirty: true,
    })),

  setSupportInterval: (setupIndex, supportIndex, interval) =>
    set((s) => ({
      skillRanges: updateActive(s.skillRanges, s.activeSkillId, (r) => ({
        ...r,
        skills: mapAt(r.skills, setupIndex, (su) => ({
          ...su,
          support_skills: mapAt(su.support_skills ?? [], supportIndex, (sup) => withInterval(sup, interval)),
        })),
      })),
      dirty: true,
    })),

  setSkillText: (setupIndex, text, supportIndex) =>
    set((s) => ({
      skillRanges: updateActive(s.skillRanges, s.activeSkillId, (r) => ({
        ...r,
        skills: mapAt(r.skills, setupIndex, (su) =>
          supportIndex === undefined
            ? withText(su, text)
            : { ...su, support_skills: mapAt(su.support_skills ?? [], supportIndex, (sup) => withText(sup, text)) },
        ),
      })),
      dirty: true,
    })),

  setItem: (inventoryId, { additionalText, uniqueName, levelInterval }) =>
    set((s) => ({
      itemRanges: updateActive(s.itemRanges, s.activeItemId, (r) => {
        const items = [...r.items];
        const idx = items.findIndex((it) => it.inventory_id === inventoryId);
        const base: Item = idx >= 0 ? { ...items[idx] } : { inventory_id: inventoryId };
        if (uniqueName) base.unique_name = uniqueName;
        else delete base.unique_name;
        if (additionalText) base.additional_text = additionalText;
        else delete base.additional_text;
        if (levelInterval) base.level_interval = levelInterval;
        else delete base.level_interval;
        if (idx >= 0) items[idx] = base;
        else items.push(base);
        return { ...r, items };
      }),
      dirty: true,
    })),

  clearItem: (inventoryId) =>
    set((s) => ({
      itemRanges: updateActive(s.itemRanges, s.activeItemId, (r) => ({ ...r, items: r.items.filter((it) => it.inventory_id !== inventoryId) })),
      dirty: true,
    })),

  setMeta: ({ name, author, description }) =>
    set((s) => {
      const build = { ...s.build };
      if (name !== undefined) build.name = name;
      if (author !== undefined) {
        if (author) build.author = author;
        else delete build.author;
      }
      if (description !== undefined) {
        if (description) build.description = description;
        else delete build.description;
      }
      return { build, dirty: true };
    }),

  serialize: () => {
    const { tree, build, passiveRanges, skillRanges, itemRanges, startSkill } = get();
    if (!tree) return serializeBuild(build);
    return serializeBuild(rangesToBuild(build, passiveRanges, skillRanges, itemRanges, tree, startSkill));
  },
}));
