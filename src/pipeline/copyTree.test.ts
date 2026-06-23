import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyTree } from '../../scripts/copy-tree.mjs';

const temps: string[] = [];
function tmp(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  temps.push(d);
  return d;
}
afterEach(() => {
  for (const d of temps.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('copyTree', () => {
  it('copies data.json and the assets directory into the destination', () => {
    const src = tmp('poe2-src-');
    const dest = join(tmp('poe2-dest-'), 'tree', '0.5.2');
    writeFileSync(join(src, 'data.json'), '{"tree":"Default"}');
    mkdirSync(join(src, 'assets'));
    writeFileSync(join(src, 'assets', 'skills.json'), '{"frames":{}}');

    copyTree(src, dest);

    expect(existsSync(join(dest, 'data.json'))).toBe(true);
    expect(existsSync(join(dest, 'assets', 'skills.json'))).toBe(true);
  });
});
