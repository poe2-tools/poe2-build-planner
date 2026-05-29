import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchData } from '../../scripts/fetch-data.mjs';

const temps: string[] = [];
function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  temps.push(d);
  return d;
}
afterEach(() => {
  for (const d of temps.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('fetchData', () => {
  it('writes the fetched gem json into destRoot/skill_gems.json', async () => {
    const dest = join(tmp('poe2-gems-'), 'data', 'poe2');
    const body = '{"Metadata/Items/Gem/X":{"color":"g"}}';
    const fake = (async () => ({ ok: true, text: async () => body })) as unknown as typeof fetch;

    await fetchData(dest, fake);

    expect(existsSync(join(dest, 'skill_gems.json'))).toBe(true);
    expect(readFileSync(join(dest, 'skill_gems.json'), 'utf8')).toBe(body);
  });

  it('throws when the response is not ok', async () => {
    const dest = join(tmp('poe2-gems-'), 'data', 'poe2');
    const fake = (async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    await expect(fetchData(dest, fake)).rejects.toThrow('503');
  });
});
