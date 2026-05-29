export type LevelInterval = [number, number];

export interface SupportGem {
  id: string;
  level_interval?: LevelInterval;
  additional_text?: string;
  /** Unrecognized keys, preserved for lossless round-trip. */
  extra?: Record<string, unknown>;
}

export interface SkillSetup {
  id: string;
  level_interval?: LevelInterval;
  support_skills?: SupportGem[];
  additional_text?: string;
  extra?: Record<string, unknown>;
}

export interface Passive {
  id: string;
  weapon_set?: number;
  level_interval?: LevelInterval;
  additional_text?: string;
  extra?: Record<string, unknown>;
}

export interface Item {
  inventory_id: string;
  unique_name?: string;
  additional_text?: string;
  level_interval?: LevelInterval;
  extra?: Record<string, unknown>;
}

export interface Build {
  name: string;
  author?: string;
  description?: string;
  ascendancy?: string;
  passives: Passive[];
  skills: SkillSetup[];
  items: Item[];
  extra?: Record<string, unknown>;
}
