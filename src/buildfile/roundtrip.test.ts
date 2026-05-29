import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBuild } from './parse';
import { serializeBuild } from './serialize';

const samples = ['Builds/sample.build'];

describe('round-trip', () => {
  // Semantic round-trip: parse -> serialize -> parse yields the same model. Byte equality no
  // longer holds because the inventory array is exported under the official `inventory_slots`
  // key even when the source used the legacy `items` key; both parse to the same model.
  it.each(samples)('parses then serializes %s with no semantic loss', (path) => {
    const raw = readFileSync(path, 'utf8');
    const out = serializeBuild(parseBuild(raw));
    expect(parseBuild(out)).toEqual(parseBuild(raw));
  });

  it('drops undefined optional fields from output', () => {
    const out = serializeBuild(parseBuild('{"name":"X","passives":[{"id":"a"}],"skills":[],"items":[]}'));
    expect(JSON.parse(out)).toEqual({ name: 'X', passives: [{ id: 'a' }], skills: [], inventory_slots: [] });
  });

  it('pretty-prints the output with 2-space indentation', () => {
    const out = serializeBuild(parseBuild('{"name":"X","passives":[{"id":"a"}],"skills":[],"items":[]}'));
    expect(out).toContain('\n  "name": "X"');
    expect(out).toBe(JSON.stringify(JSON.parse(out), null, 2));
  });

  // By design, the parser normalizes bare-string passives to object form; the
  // serializer always emits objects. Round-trip is semantic (allocated ids, level
  // intervals, unknown fields), not byte-for-byte on the string-vs-object shorthand.
  it('normalizes a bare-string passive to object form', () => {
    const out = serializeBuild(parseBuild('{"name":"X","passives":["foo"],"skills":[],"items":[]}'));
    expect(JSON.parse(out)).toEqual({ name: 'X', passives: [{ id: 'foo' }], skills: [], inventory_slots: [] });
  });

  describe('inventory_slots (official equipment key)', () => {
    it('exports the inventory array under inventory_slots, never items', () => {
      const out = JSON.parse(serializeBuild(parseBuild('{"name":"X","items":[{"inventory_id":"Helm"}]}')));
      expect(out.inventory_slots).toEqual([{ inventory_id: 'Helm' }]);
      expect(out.items).toBeUndefined();
    });

    it('parses both inventory_slots and the legacy items key into the model', () => {
      expect(parseBuild('{"name":"X","inventory_slots":[{"inventory_id":"Belt"}]}').items).toEqual([{ inventory_id: 'Belt' }]);
      expect(parseBuild('{"name":"X","items":[{"inventory_id":"Belt"}]}').items).toEqual([{ inventory_id: 'Belt' }]);
    });

    it('does not leak inventory_slots into extra', () => {
      expect(parseBuild('{"name":"X","inventory_slots":[]}').extra).toBeUndefined();
    });
  });
});
