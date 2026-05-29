import type { Build, Passive, SkillSetup, SupportGem, Item } from './types';

function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

function support(s: SupportGem): Record<string, unknown> {
  return clean({ id: s.id, level_interval: s.level_interval, additional_text: s.additional_text, ...s.extra });
}

function skill(s: SkillSetup): Record<string, unknown> {
  return clean({
    id: s.id,
    level_interval: s.level_interval,
    support_skills: s.support_skills?.map(support),
    additional_text: s.additional_text,
    ...s.extra,
  });
}

function passive(p: Passive): Record<string, unknown> {
  return clean({
    id: p.id,
    weapon_set: p.weapon_set,
    level_interval: p.level_interval,
    additional_text: p.additional_text,
    ...p.extra,
  });
}

function item(it: Item): Record<string, unknown> {
  return clean({
    inventory_id: it.inventory_id,
    unique_name: it.unique_name,
    additional_text: it.additional_text,
    level_interval: it.level_interval,
    ...it.extra,
  });
}

export function buildToObject(b: Build): Record<string, unknown> {
  return clean({
    name: b.name,
    author: b.author,
    description: b.description,
    ascendancy: b.ascendancy,
    passives: b.passives.map(passive),
    skills: b.skills.map(skill),
    inventory_slots: b.items.map(item),
    ...b.extra,
  });
}

export function serializeBuild(b: Build): string {
  return JSON.stringify(buildToObject(b), null, 2);
}
