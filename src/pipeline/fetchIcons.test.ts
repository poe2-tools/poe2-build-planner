import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectIconPaths, iconDest, fetchIcons } from '../../scripts/fetch-icons.mjs';

const temps: string[] = [];
function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  temps.push(d);
  return d;
}
afterEach(() => {
  for (const d of temps.splice(0)) rmSync(d, { recursive: true, force: true });
});

const gem = (display_name: string, icon_dds_file?: string) => ({
  base_item: { display_name },
  color: 'g',
  gem_type: 'active',
  ...(icon_dds_file ? { icon_dds_file } : {}),
});

describe('collectIconPaths', () => {
  it('returns unique icon paths, skipping hidden, unique-shadow, icon-less, and malformed gems', () => {
    const json = {
      'Metadata/Items/Gem/A': gem('Alpha', 'art/a.dds'),
      'Metadata/Items/Gem/B': gem('Beta', 'art/a.dds'), // duplicate icon
      'Metadata/Items/Gem/DNT': gem('[DNT] Dev', 'art/dnt.dds'),
      'Metadata/Items/Gem/Soon': gem('Coming Soon', 'art/soon.dds'),
      'Metadata/Items/UniqueThing': gem('Unique', 'art/u.dds'),
      'Metadata/Items/Gem/NoIcon': gem('NoIcon'),
      'Metadata/Items/Gem/Placeholder': gem('Placeholder', '4k/'), // malformed: no filename
    };
    expect(collectIconPaths(json)).toEqual(['art/a.dds']);
  });
});

describe('iconDest', () => {
  it('maps the .dds source to a .png under destRoot', () => {
    expect(iconDest('/root', 'Art/Sub/x.dds')).toBe(join('/root', 'Art/Sub/x.png'));
  });
});

describe('fetchIcons', () => {
  it('downloads each icon as a png and skips files already on disk', async () => {
    const dest = join(tmp('poe2-icons-'), 'icons');
    const fake = (async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    })) as unknown as typeof fetch;

    const first = await fetchIcons(dest, ['Art/a.dds'], fake);
    expect(first.downloaded).toBe(1);
    expect(first.failed).toEqual([]);
    expect(existsSync(join(dest, 'Art/a.png'))).toBe(true);
    expect([...readFileSync(join(dest, 'Art/a.png'))]).toEqual([1, 2, 3]);

    const second = await fetchIcons(dest, ['Art/a.dds'], fake);
    expect(second).toMatchObject({ downloaded: 0, skipped: 1 });
  });

  it('records failures for non-ok responses without throwing', async () => {
    const dest = join(tmp('poe2-icons-'), 'icons');
    const fake = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const r = await fetchIcons(dest, ['Art/missing.dds'], fake);
    expect(r.downloaded).toBe(0);
    expect(r.failed).toEqual(['Art/missing.dds (404)']);
  });
});
