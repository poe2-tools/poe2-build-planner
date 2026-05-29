import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GGPK_BASE = 'https://image.ggpk.exposed/poe2';

/** Dev/placeholder/duplicate gems whose icons never reach the picker (mirrors src/gems/data.ts). */
function isHiddenGem(id, displayName) {
  if (displayName.startsWith('[DNT') || displayName.startsWith('Playtest ')) return true;
  if (displayName === 'Coming Soon') return true;
  if (/unique/i.test(id)) return true;
  return false;
}

/** Unique `icon_dds_file` paths for every gem that can appear in the picker. */
export function collectIconPaths(gemsJson) {
  const paths = new Set();
  for (const [id, raw] of Object.entries(gemsJson)) {
    const displayName = raw?.base_item?.display_name;
    if (!displayName || !raw.color || !raw.gem_type || !raw.icon_dds_file) continue;
    if (isHiddenGem(id, displayName)) continue;
    // Some placeholder gems carry a malformed icon path like "4k/" (no filename); skip those.
    if (!/\.dds$/i.test(raw.icon_dds_file)) continue;
    paths.add(raw.icon_dds_file);
  }
  return [...paths];
}

/** Local served path for an icon: the `.dds` source becomes a `.png` under destRoot. */
export function iconDest(destRoot, iconDdsFile) {
  return join(destRoot, iconDdsFile.replace(/\.dds$/i, '.png'));
}

/** Download each icon (skipping ones already on disk) into destRoot. */
export async function fetchIcons(destRoot, paths, fetchImpl = fetch, concurrency = 12) {
  let downloaded = 0;
  let skipped = 0;
  const failed = [];
  const queue = [...paths];
  async function worker() {
    for (let p = queue.pop(); p !== undefined; p = queue.pop()) {
      const dest = iconDest(destRoot, p);
      if (existsSync(dest)) {
        skipped++;
        continue;
      }
      try {
        const res = await fetchImpl(`${GGPK_BASE}/${p}`);
        if (!res.ok) {
          failed.push(`${p} (${res.status})`);
          continue;
        }
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        downloaded++;
      } catch (e) {
        failed.push(`${p} (${e})`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length || 1) }, worker));
  return { downloaded, skipped, failed };
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  const projectRoot = dirname(dirname(thisFile));
  const gemsPath = join(projectRoot, 'public', 'data', 'poe2', 'skill_gems.json');
  const paths = collectIconPaths(JSON.parse(readFileSync(gemsPath, 'utf8')));
  const destRoot = join(projectRoot, 'public', 'icons', 'poe2');
  console.log(`Fetching ${paths.length} gem icons -> public/icons/poe2/ ...`);
  const { downloaded, skipped, failed } = await fetchIcons(destRoot, paths);
  console.log(`Done. downloaded=${downloaded} skipped=${skipped} failed=${failed.length}`);
  if (failed.length) {
    console.error('Failed:', failed.slice(0, 20));
    process.exitCode = 1;
  }
}
