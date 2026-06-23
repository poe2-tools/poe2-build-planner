import { describe, it, expect } from 'vitest';
import { intervalKey, intervalLabel, rangeLabel, compareRanges, DEFAULT_ID } from './ranges';
import type { RangeBase } from './ranges';
import { dimmedByWeaponSet } from './ranges';
import type { PassiveRange } from './ranges';

const r = (interval: [number, number] | null, isDefault = false): RangeBase =>
  ({ id: isDefault ? DEFAULT_ID : `${interval}`, interval, isDefault });

describe('intervalKey', () => {
  it('folds absent / [0,100] / [1,100] to default', () => {
    expect(intervalKey(null)).toBe('default');
    expect(intervalKey(undefined)).toBe('default');
    expect(intervalKey([0, 100])).toBe('default');
    expect(intervalKey([1, 100])).toBe('default');
  });
  it('keys other intervals by their bounds', () => {
    expect(intervalKey([1, 20])).toBe('1-20');
    expect(intervalKey([35, 50])).toBe('35-50');
  });
});

describe('intervalLabel', () => {
  it('labels default and bounded ranges', () => {
    expect(intervalLabel(null)).toBe('Default');
    expect(intervalLabel([1, 30])).toBe('1–30');
  });
});

describe('rangeLabel', () => {
  it('shows the implicit 1-100 span for the default range and the bounds otherwise', () => {
    expect(rangeLabel(r(null, true))).toBe('Default (1-100)');
    expect(rangeLabel(r([15, 60]))).toBe('15–60');
  });
});

describe('compareRanges', () => {
  it('sorts default first, then ascending by from, ties by to', () => {
    const sorted = [r([15, 100]), r([1, 20]), r(null, true), r([1, 50])].sort(compareRanges);
    expect(sorted.map((x) => x.interval)).toEqual([null, [1, 20], [1, 50], [15, 100]]);
  });
});

import { readFileSync } from 'node:fs';
import { indexTree } from '../tree/data';
import { parseBuild, serializeBuild } from '../buildfile';
import { buildToRanges, rangesToBuild } from './ranges';

const tree = indexTree(JSON.parse(readFileSync('Skill Trees/0.5.2/data.json', 'utf8')));
const bag = (arr: unknown[]) => arr.map((x) => JSON.stringify(x)).sort();

// Normalize the [0,100]/[1,100] -> default fold on the *original* so the round-trip
// comparison only holds the model accountable for the documented exception.
const norm = (b: ReturnType<typeof parseBuild>) => {
  const drop = (x: { level_interval?: [number, number] }) => {
    const iv = x.level_interval;
    if (iv && (iv[0] === 0 || iv[0] === 1) && iv[1] === 100) {
      const { level_interval, ...rest } = x;
      void level_interval;
      return rest;
    }
    return x;
  };
  return {
    passives: b.passives.map(drop),
    skills: b.skills.map(drop),
    items: b.items.map(drop),
  };
};

describe('buildToRanges grouping', () => {
  it('creates one range per distinct interval plus default, overlaps allowed', () => {
    const build = parseBuild(JSON.stringify({
      name: 'x',
      passives: [
        { id: 'projectiles15', level_interval: [1, 20] },
        { id: 'projectiles15', level_interval: [15, 100] },
        { id: 'projectiles15', level_interval: [35, 50] },
        { id: 'projectiles15' },
      ],
    }));
    const { passiveRanges } = buildToRanges(build, tree, null);
    expect(passiveRanges.length).toBe(4);
    expect(passiveRanges[0].isDefault).toBe(true);
    expect(passiveRanges.map((r) => r.interval)).toEqual([null, [1, 20], [15, 100], [35, 50]]);
  });

  it('keeps passive weapon_set + note in the per-node entry', () => {
    const build = parseBuild(JSON.stringify({
      name: 'x',
      passives: [{ id: 'projectiles15', weapon_set: 2, additional_text: 'hi' }],
    }));
    const { passiveRanges } = buildToRanges(build, tree, null);
    const skill = tree.nodesById.get('projectiles15')!.skill;
    const entry = passiveRanges[0].entries.get(skill)!;
    expect(entry.weapon_set).toBe(2);
    expect(entry.additional_text).toBe('hi');
    expect(entry.level_interval).toBeUndefined();
  });

  it('always provides a default range even when the file has none of an interval', () => {
    const { passiveRanges, skillRanges, itemRanges } = buildToRanges(parseBuild('{"name":"x"}'), tree, null);
    expect(passiveRanges[0].isDefault).toBe(true);
    expect(skillRanges[0].isDefault).toBe(true);
    expect(itemRanges[0].isDefault).toBe(true);
  });
});

describe('round-trip (buildToRanges -> rangesToBuild)', () => {
  for (const file of ['Builds/sample.build']) {
    it(`preserves ${file} semantically`, () => {
      const original = parseBuild(readFileSync(file, 'utf8'));
      const { passiveRanges, skillRanges, itemRanges } = buildToRanges(original, tree, null);
      const out = parseBuild(serializeBuild(rangesToBuild(original, passiveRanges, skillRanges, itemRanges, tree, null)));
      const a = norm(original);
      const b = norm(out);
      expect(bag(b.passives)).toEqual(bag(a.passives));
      expect(bag(b.skills)).toEqual(bag(a.skills));
      expect(bag(b.items)).toEqual(bag(a.items));
    });
  }
});

describe('dimmedByWeaponSet', () => {
  const mk = (entries: [number, number | undefined][]): PassiveRange => ({
    id: 'r', interval: null, isDefault: true,
    allocated: new Set(entries.map(([s]) => s)),
    entries: new Map(
      entries.filter(([, w]) => w !== undefined).map(([s, w]) => [s, { id: String(s), weapon_set: w }]),
    ),
  });

  it('dims the other set, never dims shared/untagged, and dims nothing when active is 0', () => {
    const range = mk([[1, 1], [2, 2], [3, undefined]]);
    expect([...dimmedByWeaponSet(range, 1)]).toEqual([2]);
    expect([...dimmedByWeaponSet(range, 2)]).toEqual([1]);
    expect([...dimmedByWeaponSet(range, 0)]).toEqual([]);
  });

  it('returns an empty set for an undefined range', () => {
    expect(dimmedByWeaponSet(undefined, 1).size).toBe(0);
  });
});
