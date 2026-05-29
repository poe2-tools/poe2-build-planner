export type GemColor = 'r' | 'g' | 'b' | 'w';
export type GemType = 'active' | 'support' | 'spirit';

export interface Gem {
  id: string; // metadata path = .build skills[].id
  displayName: string;
  color: GemColor; // single channel, verbatim from skill_gems.json
  gemType: GemType;
  iconDdsFile: string;
  recommendedSupports?: string[]; // metadata paths
  isMeta: boolean; // tags include "meta": accepts other skill gems in its sockets (Cast on X, totems, …)
}

export interface GemQuery {
  query?: string; // case-insensitive substring on displayName
  gemType?: GemType;
  color?: GemColor; // exact match on the gem's color string
}
