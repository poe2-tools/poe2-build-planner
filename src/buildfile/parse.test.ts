import { describe, it, expect } from 'vitest';
import { parseBuild } from './parse';
import { serializeBuild } from './serialize';

describe('parseBuild', () => {
  it('normalizes a bare-string passive to an object with id', () => {
    const build = parseBuild('{"name":"X","passives":["foo"],"skills":[],"items":[]}');
    expect(build.passives[0]).toEqual({ id: 'foo' });
  });

  it('keeps known passive fields and bags unknown ones in extra', () => {
    const build = parseBuild(
      '{"name":"X","passives":[{"id":"a","weapon_set":1,"mystery":7}],"skills":[],"items":[]}',
    );
    expect(build.passives[0]).toEqual({ id: 'a', weapon_set: 1, extra: { mystery: 7 } });
  });

  it('parses nested support skills', () => {
    const build = parseBuild(
      '{"name":"X","passives":[],"items":[],"skills":[{"id":"S","support_skills":[{"id":"sup","level_interval":[1,100]}]}]}',
    );
    expect(build.skills[0].support_skills).toEqual([{ id: 'sup', level_interval: [1, 100] }]);
  });

  it('defaults missing arrays to empty', () => {
    const build = parseBuild('{"name":"X"}');
    expect(build.passives).toEqual([]);
    expect(build.skills).toEqual([]);
    expect(build.items).toEqual([]);
  });
});

describe('unique_name + interval normalization', () => {
  it('parses unique_name as a typed field, not into extra', () => {
    const b = parseBuild(JSON.stringify({ name: 'x', items: [{ inventory_id: 'Amulet', unique_name: "Kalandra's Touch" }] }));
    expect(b.items[0].unique_name).toBe("Kalandra's Touch");
    expect(b.items[0].extra).toBeUndefined();
  });

  it('round-trips unique_name', () => {
    const text = JSON.stringify({ name: 'x', items: [{ inventory_id: 'Amulet', unique_name: 'Astramentis' }] });
    const out = parseBuild(serializeBuild(parseBuild(text)));
    expect(out.items[0].unique_name).toBe('Astramentis');
  });

  it('normalizes a single-uint level_interval to a tuple', () => {
    const b = parseBuild(JSON.stringify({
      name: 'x',
      passives: [{ id: 'projectiles15', level_interval: 42 }],
      skills: [{ id: 'g', level_interval: 7 }],
      items: [{ inventory_id: 'Helm', level_interval: 3 }],
    }));
    expect(b.passives[0].level_interval).toEqual([42, 42]);
    expect(b.skills[0].level_interval).toEqual([7, 7]);
    expect(b.items[0].level_interval).toEqual([3, 3]);
  });
});
