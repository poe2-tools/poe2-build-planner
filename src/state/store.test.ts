import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { indexTree, classIndexForAscendancy, classStartNode } from '../tree/data';
import { parseBuild } from '../buildfile';
import { useStore } from './store';
import { DEFAULT_ID } from './ranges';

const tree = indexTree(JSON.parse(readFileSync('Skill Trees/0.5.2/data.json', 'utf8')));
const buildText = readFileSync('Builds/sample.build', 'utf8');
const WARRIOR = classIndexForAscendancy(tree, 'Warrior1'); // the sample build's class
const WITCH = classIndexForAscendancy(tree, 'Witch1');
const RANGER3 = classIndexForAscendancy(tree, 'Ranger3'); // Pathfinder — has a multiple-choice group

function freshLoad() {
  const build = parseBuild(buildText);
  useStore.getState().setTree(tree);
  useStore.getState().loadBuild(build);
  return build;
}

const activePassive = () => {
  const s = useStore.getState();
  return s.passiveRanges.find((r) => r.id === s.activePassiveId)!;
};
const activeSkill = () => {
  const s = useStore.getState();
  return s.skillRanges.find((r) => r.id === s.activeSkillId)!;
};
const activeItem = () => {
  const s = useStore.getState();
  return s.itemRanges.find((r) => r.id === s.activeItemId)!;
};

beforeEach(() => {
  useStore.getState().reset();
});

describe('loadBuild', () => {
  it('derives class index + start node and selects the default range per domain', () => {
    freshLoad();
    const s = useStore.getState();
    expect(s.classIndex).toBe(WARRIOR);
    expect(s.startSkill).toBe(classStartNode(tree, WARRIOR)!.skill);
    expect(s.activePassiveId).toBe(DEFAULT_ID);
    expect(s.activeSkillId).toBe(DEFAULT_ID);
    expect(s.activeItemId).toBe(DEFAULT_ID);
  });

  it('allocates every default-interval passive plus the (free) class-start node', () => {
    const build = freshLoad();
    const r = activePassive();
    expect(r.allocated.has(tree.nodesById.get('melee17')!.skill)).toBe(true);
    expect(r.allocated.has(tree.nodesById.get('AscendancyWarrior1Notable4')!.skill)).toBe(true);
    expect(r.allocated.has(useStore.getState().startSkill!)).toBe(true);
    // sample.build passives are all untagged (no level_interval) => default range holds them all + start
    expect(r.allocated.size).toBe(build.passives.length + 1);
  });
});

describe('serialize', () => {
  it('round-trips loaded passives losslessly (excluding the class start)', () => {
    const build = freshLoad();
    const out = parseBuild(useStore.getState().serialize());
    const bag = (a: unknown[]) => a.map((x) => JSON.stringify(x)).sort();
    expect(bag(out.passives)).toEqual(bag(build.passives));
  });
});

describe('clickNode', () => {
  it('toggles allocation within the active range (deallocates a leaf)', () => {
    useStore.getState().setTree(tree);
    useStore.getState().setClass(WARRIOR);
    const start = useStore.getState().startSkill!;
    // A navigable main neighbour adjacent to the start allocates as a single-node path (clean leaf).
    const neighbour = (tree.navAdjacency!.get(start) ?? []).find(
      (n) => n !== start && tree.nodesBySkill.get(n)!.ascendancyId === undefined,
    )!;
    useStore.getState().clickNode(neighbour);
    const before = activePassive().allocated.size;
    expect(activePassive().allocated.has(neighbour)).toBe(true);
    useStore.getState().clickNode(neighbour); // deallocate the leaf
    expect(activePassive().allocated.has(neighbour)).toBe(false);
    expect(activePassive().allocated.size).toBe(before - 1);
    expect(useStore.getState().dirty).toBe(true);
  });

  it('refuses to remove the start node', () => {
    freshLoad();
    const start = useStore.getState().startSkill!;
    useStore.getState().clickNode(start);
    expect(activePassive().allocated.has(start)).toBe(true);
  });

  it('prunes a deallocated node from the entries map', () => {
    freshLoad();
    const skill = tree.nodesById.get('melee17')!.skill;
    expect(activePassive().entries.has(skill)).toBe(true);
    useStore.getState().clickNode(skill);
    expect(activePassive().entries.has(skill)).toBe(false);
  });

  it('enforces single choice: allocating a second multiple-choice option removes the first', () => {
    const PARENT = 57141; // Brew Concoction (Ranger3 multiple-choice parent)
    const FIRST = 9710; // Bleeding Concoction
    const SECOND = 18940; // Shattering Concoction
    useStore.getState().setTree(tree);
    useStore.getState().setClass(RANGER3);
    useStore.getState().setAscendancy('Ranger3'); // un-block the Ranger3 ascendancy nodes
    useStore.getState().clickNode(PARENT); // allocate the parent via a real connecting path
    useStore.getState().clickNode(FIRST); // first option
    expect(activePassive().allocated.has(FIRST)).toBe(true);
    useStore.getState().clickNode(SECOND); // second option must displace the first
    const a = activePassive().allocated;
    expect(a.has(SECOND)).toBe(true);
    expect(a.has(FIRST)).toBe(false); // sibling option removed
    expect(activePassive().entries.has(FIRST)).toBe(false); // its entry pruned too
  });
});

describe('setClass', () => {
  it('switches the start node and resets the passive ranges to a single default', () => {
    useStore.getState().setTree(tree);
    useStore.getState().setClass(WITCH);
    const s = useStore.getState();
    expect(s.startSkill).toBe(classStartNode(tree, WITCH)!.skill);
    expect(s.passiveRanges.length).toBe(1);
    expect(s.passiveRanges[0].isDefault).toBe(true);
    expect(activePassive().allocated.size).toBe(1);
    expect(activePassive().allocated.has(s.startSkill!)).toBe(true);
  });
});

describe('skill editing (active range)', () => {
  it('adds/removes skill setups in the active range, marking dirty', () => {
    freshLoad();
    const before = activeSkill().skills.length;
    useStore.getState().addSkillSetup('Metadata/Items/Gem/SkillGemIceShot');
    expect(activeSkill().skills.length).toBe(before + 1);
    expect(activeSkill().skills.at(-1)!.id).toBe('Metadata/Items/Gem/SkillGemIceShot');
    expect(useStore.getState().dirty).toBe(true);
    useStore.getState().removeSkillSetup(before);
    expect(activeSkill().skills.length).toBe(before);
  });

  it('adds/removes supports and edits support interval/text', () => {
    freshLoad();
    useStore.getState().addSkillSetup('Metadata/Items/Gem/SkillGemIceShot');
    const i = activeSkill().skills.length - 1;
    useStore.getState().addSupport(i, 'Metadata/Items/Gems/SupportGemFork');
    expect(activeSkill().skills[i].support_skills).toEqual([{ id: 'Metadata/Items/Gems/SupportGemFork' }]);
    useStore.getState().setSupportInterval(i, 0, [5, 8]);
    useStore.getState().setSkillText(i, 'sup note', 0);
    const sup = activeSkill().skills[i].support_skills![0];
    expect(sup.level_interval).toEqual([5, 8]);
    expect(sup.additional_text).toBe('sup note');
    useStore.getState().setSupportInterval(i, 0, undefined);
    expect(activeSkill().skills[i].support_skills![0].level_interval).toBeUndefined();
    useStore.getState().removeSupport(i, 0);
    expect(activeSkill().skills[i].support_skills).toEqual([]);
  });

  it('reorders setups and clamps at bounds', () => {
    freshLoad();
    useStore.getState().addSkillSetup('Metadata/Items/Gem/SkillGemIceShot');
    useStore.getState().addSkillSetup('Metadata/Items/Gem/SkillGemSpark');
    const last = activeSkill().skills.length - 1;
    useStore.getState().moveSkillSetup(last, -1);
    expect(activeSkill().skills[last - 1].id).toBe('Metadata/Items/Gem/SkillGemSpark');
    expect(activeSkill().skills[last].id).toBe('Metadata/Items/Gem/SkillGemIceShot');
    const before = activeSkill().skills;
    useStore.getState().moveSkillSetup(0, -1);
    expect(activeSkill().skills).toBe(before);
  });
});

describe('item editing (active range)', () => {
  it('upserts an item by inventory_id and clears it', () => {
    freshLoad();
    useStore.getState().setItem('BodyArmour', { additionalText: 'Sage Robe\n+100 life' });
    expect(activeItem().items.find((x) => x.inventory_id === 'BodyArmour')!.additional_text).toBe('Sage Robe\n+100 life');
    useStore.getState().clearItem('BodyArmour');
    expect(activeItem().items.find((x) => x.inventory_id === 'BodyArmour')).toBeUndefined();
  });

  it('round-trips a unique_name and removes it when cleared', () => {
    freshLoad();
    useStore.getState().setItem('Amulet1', { uniqueName: 'Astramentis' });
    expect(activeItem().items.find((x) => x.inventory_id === 'Amulet1')!.unique_name).toBe('Astramentis');
    const out = parseBuild(useStore.getState().serialize());
    expect(out.items.find((it) => it.inventory_id === 'Amulet1')!.unique_name).toBe('Astramentis');
    useStore.getState().setItem('Amulet1', {});
    expect(activeItem().items.find((x) => x.inventory_id === 'Amulet1')!.unique_name).toBeUndefined();
  });
});

describe('meta editing', () => {
  it('sets name/author and removes empties', () => {
    freshLoad();
    useStore.getState().setMeta({ name: 'My Build', author: 'Theo' });
    expect(useStore.getState().build.name).toBe('My Build');
    expect(useStore.getState().build.author).toBe('Theo');
    useStore.getState().setMeta({ author: '' });
    expect(useStore.getState().build.author).toBeUndefined();
  });
});

describe('range management', () => {
  it('adds an empty range and selects it', () => {
    freshLoad();
    // loadBuild may yield one or more skill ranges depending on the fixture's level_intervals,
    // so assert a *relative* count, not an absolute one.
    const before = useStore.getState().skillRanges.length;
    useStore.getState().addRange('skills');
    const s = useStore.getState();
    expect(s.skillRanges.length).toBe(before + 1);
    expect(s.activeSkillId).toBe(s.skillRanges.at(-1)!.id);
    expect(activeSkill().skills).toEqual([]);
    expect(activeSkill().isDefault).toBe(false);
  });

  it('duplicates a range with a deep copy (mutating the copy leaves the source intact)', () => {
    freshLoad();
    useStore.getState().addRange('skills'); // fresh empty range, now active
    const srcId = useStore.getState().activeSkillId;
    useStore.getState().addSkillSetup('Metadata/Items/Gem/SkillGemIceShot');
    useStore.getState().duplicateRange('skills', srcId);
    const copyId = useStore.getState().activeSkillId;
    expect(copyId).not.toBe(srcId);
    expect(activeSkill().skills.map((x) => x.id)).toEqual(['Metadata/Items/Gem/SkillGemIceShot']);
    useStore.getState().addSkillSetup('Metadata/Items/Gem/SkillGemSpark');
    const src = useStore.getState().skillRanges.find((r) => r.id === srcId)!;
    expect(src.skills.length).toBe(1); // unchanged
  });

  it('refuses to delete the default range; deleting the active range falls back to default', () => {
    freshLoad();
    useStore.getState().deleteRange('skills', DEFAULT_ID);
    expect(useStore.getState().skillRanges.some((r) => r.isDefault)).toBe(true);
    useStore.getState().addRange('skills');
    const newId = useStore.getState().activeSkillId;
    useStore.getState().deleteRange('skills', newId);
    expect(useStore.getState().skillRanges.find((r) => r.id === newId)).toBeUndefined();
    expect(useStore.getState().activeSkillId).toBe(DEFAULT_ID);
  });

  it('sets a non-default interval (no-op on default)', () => {
    freshLoad();
    useStore.getState().addRange('items');
    const id = useStore.getState().activeItemId;
    useStore.getState().setRangeInterval('items', id, [60, 100]);
    const r = useStore.getState().itemRanges.find((x) => x.id === id)!;
    expect(r.interval).toEqual([60, 100]);
    useStore.getState().setRangeInterval('items', DEFAULT_ID, [1, 5]);
    expect(useStore.getState().itemRanges.find((x) => x.isDefault)!.interval).toBeNull();
  });

  it('exports repeated ids across ranges differentiated by level_interval', () => {
    freshLoad();
    useStore.getState().setActiveRange('items', DEFAULT_ID);
    useStore.getState().setItem('Helm', { additionalText: 'Iron Hat' });
    useStore.getState().addRange('items');
    const id = useStore.getState().activeItemId;
    useStore.getState().setRangeInterval('items', id, [30, 60]);
    useStore.getState().setItem('Helm', { additionalText: 'Steel Hat' });
    const out = parseBuild(useStore.getState().serialize());
    const helms = out.items.filter((it) => it.inventory_id === 'Helm');
    // The default-range Helm (no interval) and the [30,60] Helm must both be present,
    // distinguished by level_interval. Do NOT assert a total count.
    expect(helms.find((h) => h.level_interval === undefined)!.additional_text).toBe('Iron Hat');
    expect(helms.find((h) => JSON.stringify(h.level_interval) === '[30,60]')!.additional_text).toBe('Steel Hat');
  });

  it('setActiveRange switches what the active getters see', () => {
    freshLoad();
    useStore.getState().addRange('skills');
    const newId = useStore.getState().activeSkillId;
    useStore.getState().setActiveRange('skills', DEFAULT_ID);
    expect(useStore.getState().activeSkillId).toBe(DEFAULT_ID);
    useStore.getState().setActiveRange('skills', newId);
    expect(useStore.getState().activeSkillId).toBe(newId);
  });
});

describe('weapon sets + node notes', () => {
  const reachable = () => tree.nodesById.get('projectiles15')!.skill; // reachable from any class start

  it('setActiveWeaponSet updates state', () => {
    useStore.getState().setActiveWeaponSet(2);
    expect(useStore.getState().activeWeaponSet).toBe(2);
  });

  it('tags newly-allocated nodes with the active set and serializes weapon_set', () => {
    useStore.getState().setTree(tree);
    useStore.getState().setClass(WARRIOR); // single default range with just the start node
    useStore.getState().setActiveWeaponSet(2);
    const target = reachable();
    useStore.getState().clickNode(target);
    expect(activePassive().allocated.has(target)).toBe(true);
    expect(activePassive().entries.get(target)?.weapon_set).toBe(2);
    const out = parseBuild(useStore.getState().serialize());
    expect(out.passives.find((p) => p.id === 'projectiles15')!.weapon_set).toBe(2);
  });

  it('does not tag when the active set is Shared (0)', () => {
    useStore.getState().setTree(tree);
    useStore.getState().setClass(WARRIOR);
    useStore.getState().setActiveWeaponSet(0);
    const target = reachable();
    useStore.getState().clickNode(target);
    expect(activePassive().entries.get(target)?.weapon_set).toBeUndefined();
  });

  it('sets and clears a per-node note, preserving the weapon-set tag', () => {
    useStore.getState().setTree(tree);
    useStore.getState().setClass(WARRIOR);
    useStore.getState().setActiveWeaponSet(1);
    const target = reachable();
    useStore.getState().clickNode(target); // tagged set 1
    useStore.getState().setNodeNote(target, 'leveling note');
    expect(activePassive().entries.get(target)!.additional_text).toBe('leveling note');
    expect(activePassive().entries.get(target)!.weapon_set).toBe(1);
    useStore.getState().setNodeNote(target, '');
    expect(activePassive().entries.get(target)!.additional_text).toBeUndefined();
    expect(activePassive().entries.get(target)!.weapon_set).toBe(1); // tag preserved
  });

  it('ignores setNodeNote for an unallocated node', () => {
    useStore.getState().setTree(tree);
    useStore.getState().setClass(WARRIOR);
    const notAllocated = tree.nodesById.get('projectiles15')!.skill;
    useStore.getState().setNodeNote(notAllocated, 'x');
    expect(activePassive().entries.has(notAllocated)).toBe(false);
  });

  it('reset clears the active weapon set back to 0', () => {
    useStore.getState().setActiveWeaponSet(2);
    useStore.getState().reset();
    expect(useStore.getState().activeWeaponSet).toBe(0);
  });
});
