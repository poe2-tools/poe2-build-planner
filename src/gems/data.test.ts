import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { indexGems, loadGems, gemById, searchGems, isHiddenGem } from './data';

const raw = JSON.parse(readFileSync('public/data/poe2/skill_gems.json', 'utf8'));
const gems = indexGems(raw);

interface RawSkill {
  id?: string;
  support_skills?: RawSkill[];
}
function buildGemIds(): Set<string> {
  const ids = new Set<string>();
  for (const f of ['Builds/sample.build']) {
    const b = JSON.parse(readFileSync(f, 'utf8')) as { skills?: RawSkill[] };
    const walk = (arr: RawSkill[] | undefined) => {
      for (const s of arr ?? []) {
        if (s.id) ids.add(s.id);
        walk(s.support_skills);
      }
    };
    walk(b.skills);
  }
  return ids;
}

describe('indexGems', () => {
  it('maps a known gem with its display name, color and type', () => {
    const ice = gems.get('Metadata/Items/Gem/SkillGemIceShot');
    expect(ice).toBeDefined();
    expect(ice!.displayName).toBe('Ice Shot');
    expect(ice!.color).toBe('g');
    expect(ice!.gemType).toBe('active');
    expect(ice!.iconDdsFile).toBe('Art/2DArt/SkillIcons/4k/RangerIceShot.dds');
  });

  it('flags meta gems via the "meta" tag, not by gem_type', () => {
    // Cast on Freeze accepts socketed skill gems -> isMeta.
    expect(gemById(gems, 'Metadata/Items/Gems/SkillGemCastOnFreeze')?.isMeta).toBe(true);
    expect(gemById(gems, 'Metadata/Items/Gems/SkillGemSpellTotem')?.isMeta).toBe(true);
    // A plain active skill and a support gem are not meta.
    expect(gems.get('Metadata/Items/Gem/SkillGemIceShot')?.isMeta).toBe(false);
    expect(searchGems(gems, { gemType: 'support' }).every((g) => g.isMeta === false)).toBe(true);
  });

  it('excludes dev, placeholder and unique-shadow gems', () => {
    for (const g of gems.values()) {
      expect(g.displayName.startsWith('[DNT')).toBe(false);
      expect(g.displayName.startsWith('Playtest ')).toBe(false);
      expect(g.displayName).not.toBe('Coming Soon');
      expect(/unique/i.test(g.id)).toBe(false);
    }
    // the unique-item-granted "Lightning Bolt" is gone, the real socketable one remains
    expect(gems.has('Metadata/Items/Gem/SkillGemUniqueBreachLightningBolt')).toBe(false);
    expect(gems.has('Metadata/Items/Gems/SkillGemLightningBolt')).toBe(true);
  });
});

describe('isHiddenGem', () => {
  it('hides dev/placeholder/unique gems and keeps real ones', () => {
    expect(isHiddenGem('Metadata/Items/Gem/X', '[DNT] Companion Bear')).toBe(true);
    expect(isHiddenGem('Metadata/Items/Gem/X', '[DNT-UNUSED] Iron Will')).toBe(true);
    expect(isHiddenGem('Metadata/Items/Gem/X', 'Playtest Fireball')).toBe(true);
    expect(isHiddenGem('Metadata/Items/Gems/ReservationSkillGemUnknown1', 'Coming Soon')).toBe(true);
    expect(isHiddenGem('Metadata/Items/Gems/UniqueSkillGemHeraldOfAsh', 'Herald of Ash')).toBe(true);
    expect(isHiddenGem('Metadata/Items/Gem/SkillGemIceShot', 'Ice Shot')).toBe(false);
    expect(isHiddenGem('Metadata/Items/Gem/SkillGemPlayerDefault1HAxe', 'Axe Slash')).toBe(false);
  });
});

describe('gemById', () => {
  it('resolves every distinct gem id from the sample build', () => {
    for (const id of buildGemIds()) {
      expect(gemById(gems, id), id).toBeDefined();
    }
  });

  it('resolves a toggled /Gem/ <-> /Gems/ prefix', () => {
    // IceShot is stored under the singular /Gem/ key; the plural must still resolve.
    expect(gemById(gems, 'Metadata/Items/Gems/SkillGemIceShot')?.displayName).toBe('Ice Shot');
  });
});

describe('searchGems', () => {
  it('filters by gemType', () => {
    expect(searchGems(gems, { gemType: 'support' }).every((g) => g.gemType === 'support')).toBe(true);
  });

  it('filters by exact color string', () => {
    expect(searchGems(gems, { color: 'g' }).every((g) => g.color === 'g')).toBe(true);
  });

  it('filters by case-insensitive name substring and sorts by name', () => {
    const res = searchGems(gems, { query: 'ice shot' });
    expect(res.some((g) => g.displayName === 'Ice Shot')).toBe(true);
    const names = res.map((g) => g.displayName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('loadGems', () => {
  it('fetches and indexes via the injected fetch', async () => {
    const fake = (async () => ({ ok: true, json: async () => raw })) as unknown as typeof fetch;
    const loaded = await loadGems(fake);
    expect(loaded.get('Metadata/Items/Gem/SkillGemIceShot')?.displayName).toBe('Ice Shot');
  });
});
