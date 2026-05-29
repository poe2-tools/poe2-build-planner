import type { Gem, GemColor, GemType, GemQuery } from './types';

interface RawGem {
  base_item?: { display_name?: string };
  color?: string;
  gem_type?: string;
  icon_dds_file?: string;
  recommended_supports?: string[];
  tags?: string[];
}

/**
 * Dev/placeholder/duplicate gems that should never reach the picker.
 * - `[DNT…]` / `Playtest …`: GGG "Do Not Translate" dev content (release_state is useless — all "released").
 * - `Coming Soon`: unannounced reservation-gem placeholders.
 * - metadata key containing `unique`: unique-item-granted skills that shadow a real socketable gem by name.
 */
export function isHiddenGem(id: string, displayName: string): boolean {
  if (displayName.startsWith('[DNT') || displayName.startsWith('Playtest ')) return true;
  if (displayName === 'Coming Soon') return true;
  if (/unique/i.test(id)) return true;
  return false;
}

export function indexGems(json: unknown): Map<string, Gem> {
  const gems = new Map<string, Gem>();
  for (const [id, raw] of Object.entries(json as Record<string, RawGem>)) {
    const displayName = raw.base_item?.display_name;
    if (!displayName || !raw.color || !raw.gem_type || !raw.icon_dds_file) continue;
    if (isHiddenGem(id, displayName)) continue;
    gems.set(id, {
      id,
      displayName,
      color: raw.color as GemColor,
      gemType: raw.gem_type as GemType,
      iconDdsFile: raw.icon_dds_file,
      recommendedSupports: raw.recommended_supports,
      isMeta: Array.isArray(raw.tags) && raw.tags.includes('meta'),
    });
  }
  return gems;
}

export async function loadGems(fetchImpl: typeof fetch = fetch): Promise<Map<string, Gem>> {
  const res = await fetchImpl(`${import.meta.env.BASE_URL}data/poe2/skill_gems.json`);
  if (!res.ok) throw new Error(`Failed to load gems: ${res.status}`);
  return indexGems(await res.json());
}

export function gemById(gems: Map<string, Gem>, id: string): Gem | undefined {
  const direct = gems.get(id);
  if (direct) return direct;
  const toggled = id.includes('/Gem/') ? id.replace('/Gem/', '/Gems/') : id.replace('/Gems/', '/Gem/');
  return gems.get(toggled);
}

export function searchGems(gems: Map<string, Gem>, q: GemQuery): Gem[] {
  const needle = q.query?.toLowerCase();
  const out: Gem[] = [];
  for (const g of gems.values()) {
    if (q.gemType && g.gemType !== q.gemType) continue;
    if (q.color && g.color !== q.color) continue;
    if (needle && !g.displayName.toLowerCase().includes(needle)) continue;
    out.push(g);
  }
  out.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return out;
}
