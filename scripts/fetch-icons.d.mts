export const GGPK_BASE: string;
export function collectIconPaths(gemsJson: Record<string, unknown>): string[];
export function iconDest(destRoot: string, iconDdsFile: string): string;
export function fetchIcons(
  destRoot: string,
  paths: string[],
  fetchImpl?: typeof fetch,
  concurrency?: number,
): Promise<{ downloaded: number; skipped: number; failed: string[] }>;
