import type { TreeData, TreeNode, NodeKind } from './types';
import { indexTree, nodeKind, classIndexForAscendancy } from './data';

// BASE_URL is '/' in dev/test and '/<repo>/' on a GitHub Pages project site; it always
// ends in a slash, so the served tree paths stay correct under either base.
const TREE_BASE = `${import.meta.env.BASE_URL}tree/0.5.2`;

export function treeDataUrl(): string {
  return `${TREE_BASE}/data.json`;
}
export function atlasJsonUrl(name: string): string {
  return `${TREE_BASE}/assets/${name}.json`;
}
export function atlasImageUrl(name: string): string {
  return `${TREE_BASE}/assets/${name}.webp`;
}

/** skills.json key for a node's icon, or null when the node has no icon art. */
export function iconFrameKey(n: TreeNode): string | null {
  if (!n.icon) return null;
  const prefix = n.isKeystone ? 'keystoneActive' : n.isNotable ? 'notableActive' : 'normalActive';
  return `${prefix}:${n.icon}`;
}

type VisualState = 'unallocated' | 'canAllocate' | 'allocated';

const SUFFIX: Record<VisualState, string> = {
  unallocated: 'Unallocated',
  canAllocate: 'CanAllocate',
  allocated: 'Allocated',
};

/** frame.json key for a node's border, or null when it has no atlas frame (class start). */
export function borderFrameKey(kind: NodeKind, state: VisualState): string | null {
  switch (kind) {
    case 'small':
      return state === 'allocated'
        ? 'frame:PSSkillFrameActive'
        : state === 'canAllocate'
          ? 'frame:PSSkillFrameHighlighted'
          : 'frame:PSSkillFrame';
    case 'notable':
    case 'mastery': // no dedicated mastery frame in 0.5.2; reuse the notable frame
      return `frame:NotableFrame${SUFFIX[state]}`;
    case 'keystone':
      return `frame:KeystoneFrame${SUFFIX[state]}`;
    case 'jewel':
      return `frame:JewelFrame${SUFFIX[state]}`;
    case 'ascendancyStart':
      return 'frame:AscendancyStartNode';
    case 'classStart':
      return null;
  }
}

/** Per-class background atlas name for an ascendancy id (e.g. "background-ranger"), or null. */
export function backgroundAtlasName(tree: TreeData, ascendancyId: string): string | null {
  const ci = classIndexForAscendancy(tree, ascendancyId);
  if (ci < 0) return null;
  return `background-${tree.classes[ci].name.toLowerCase()}`;
}

/** Atlas frame key for an ascendancy's circular backdrop (e.g. "classRanger:Class1"), or null. */
export function backgroundFrameKey(tree: TreeData, ascendancyId: string): string | null {
  const ci = classIndexForAscendancy(tree, ascendancyId);
  if (ci < 0) return null;
  const cls = tree.classes[ci];
  const ai = cls.ascendancies.findIndex((a) => a.id === ascendancyId);
  if (ai < 0) return null;
  return `class${cls.name}:Class${ai + 1}`;
}

export interface Rect { x: number; y: number; w: number; h: number }
export type FrameMap = Map<string, Rect>;
export interface Atlas { image: HTMLImageElement; frames: FrameMap }

export async function loadTreeData(fetchImpl: typeof fetch = fetch): Promise<TreeData> {
  const res = await fetchImpl(treeDataUrl());
  if (!res.ok) throw new Error(`Failed to load tree data: ${res.status}`);
  return indexTree(await res.json());
}

export async function loadAtlasFrames(name: string, fetchImpl: typeof fetch = fetch): Promise<FrameMap> {
  const res = await fetchImpl(atlasJsonUrl(name));
  if (!res.ok) throw new Error(`Failed to load atlas ${name}: ${res.status}`);
  const json = (await res.json()) as { frames: Record<string, { frame: Rect }> };
  const frames: FrameMap = new Map();
  for (const [key, value] of Object.entries(json.frames)) frames.set(key, value.frame);
  return frames;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Browser-only: fetch the atlas JSON and its bitmap together. */
export async function loadAtlas(name: string): Promise<Atlas> {
  const [frames, image] = await Promise.all([loadAtlasFrames(name), loadImage(atlasImageUrl(name))]);
  return { image, frames };
}

export { nodeKind, indexTree };
export type { VisualState };
