import type { Build, Passive, SkillSetup, SupportGem, Item, LevelInterval } from './types';

function extraOf(obj: Record<string, unknown>, known: string[]): Record<string, unknown> | undefined {
  const extra: Record<string, unknown> = {};
  let has = false;
  for (const k of Object.keys(obj)) {
    if (!known.includes(k)) {
      extra[k] = obj[k];
      has = true;
    }
  }
  return has ? extra : undefined;
}

function asInterval(raw: unknown): LevelInterval {
  if (typeof raw === 'number') return [raw, raw];
  const arr = raw as number[];
  return [arr[0], arr[1]];
}

function parseSupport(raw: unknown): SupportGem {
  const o = raw as Record<string, unknown>;
  const s: SupportGem = { id: o.id as string };
  if (o.level_interval !== undefined) s.level_interval = asInterval(o.level_interval);
  if (o.additional_text !== undefined) s.additional_text = o.additional_text as string;
  const extra = extraOf(o, ['id', 'level_interval', 'additional_text']);
  if (extra) s.extra = extra;
  return s;
}

function parseSkill(raw: unknown): SkillSetup {
  const o = raw as Record<string, unknown>;
  const s: SkillSetup = { id: o.id as string };
  if (o.level_interval !== undefined) s.level_interval = asInterval(o.level_interval);
  if (Array.isArray(o.support_skills)) s.support_skills = o.support_skills.map(parseSupport);
  if (o.additional_text !== undefined) s.additional_text = o.additional_text as string;
  const extra = extraOf(o, ['id', 'level_interval', 'support_skills', 'additional_text']);
  if (extra) s.extra = extra;
  return s;
}

function parsePassive(raw: unknown): Passive {
  if (typeof raw === 'string') return { id: raw };
  const o = raw as Record<string, unknown>;
  const p: Passive = { id: o.id as string };
  if (o.weapon_set !== undefined) p.weapon_set = o.weapon_set as number;
  if (o.level_interval !== undefined) p.level_interval = asInterval(o.level_interval);
  if (o.additional_text !== undefined) p.additional_text = o.additional_text as string;
  const extra = extraOf(o, ['id', 'weapon_set', 'level_interval', 'additional_text']);
  if (extra) p.extra = extra;
  return p;
}

function parseItem(raw: unknown): Item {
  const o = raw as Record<string, unknown>;
  const it: Item = { inventory_id: o.inventory_id as string };
  if (o.unique_name !== undefined) it.unique_name = o.unique_name as string;
  if (o.additional_text !== undefined) it.additional_text = o.additional_text as string;
  if (o.level_interval !== undefined) it.level_interval = asInterval(o.level_interval);
  // slot_x / slot_y are not part of the official format; swallow them (don't surface or re-emit).
  const extra = extraOf(o, ['inventory_id', 'unique_name', 'additional_text', 'level_interval', 'slot_x', 'slot_y']);
  if (extra) it.extra = extra;
  return it;
}

export function parseBuild(text: string): Build {
  const o = JSON.parse(text) as Record<string, unknown>;
  const build: Build = {
    name: (o.name as string) ?? '',
    passives: Array.isArray(o.passives) ? o.passives.map(parsePassive) : [],
    skills: Array.isArray(o.skills) ? o.skills.map(parseSkill) : [],
    // Official key is `inventory_slots`; older files / sample fixtures use `items`. Accept both.
    items: Array.isArray(o.inventory_slots)
      ? o.inventory_slots.map(parseItem)
      : Array.isArray(o.items)
        ? o.items.map(parseItem)
        : [],
  };
  if (o.author !== undefined) build.author = o.author as string;
  if (o.description !== undefined) build.description = o.description as string;
  if (o.ascendancy !== undefined) build.ascendancy = o.ascendancy as string;
  const extra = extraOf(o, ['name', 'author', 'description', 'ascendancy', 'passives', 'skills', 'items', 'inventory_slots']);
  if (extra) build.extra = extra;
  return build;
}
