import { describe, it, expect } from 'vitest';
import type { TreeNode, TreeData } from './types';
import {
  treeDataUrl, atlasJsonUrl, atlasImageUrl, iconFrameKey, borderFrameKey,
  loadTreeData, loadAtlasFrames, backgroundAtlasName, backgroundFrameKey,
} from './source';

function node(partial: Partial<TreeNode>): TreeNode {
  return {
    skill: 1, id: 'n1', name: 'n1', stats: [], x: 0, y: 0,
    group: 0, orbit: 0, orbitIndex: 0, inNodes: [], outNodes: [], ...partial,
  };
}

describe('asset URLs', () => {
  it('builds served paths under /tree/0.5.2', () => {
    expect(treeDataUrl()).toBe('/tree/0.5.2/data.json');
    expect(atlasJsonUrl('skills')).toBe('/tree/0.5.2/assets/skills.json');
    expect(atlasImageUrl('frame')).toBe('/tree/0.5.2/assets/frame.webp');
  });
});

describe('iconFrameKey', () => {
  it('prefixes by node kind and returns null when there is no icon', () => {
    expect(iconFrameKey(node({ icon: 'Art/2DArt/SkillIcons/passives/x.png' })))
      .toBe('normalActive:Art/2DArt/SkillIcons/passives/x.png');
    expect(iconFrameKey(node({ isNotable: true, icon: 'Art/a.png' }))).toBe('notableActive:Art/a.png');
    expect(iconFrameKey(node({ isKeystone: true, icon: 'Art/b.png' }))).toBe('keystoneActive:Art/b.png');
    expect(iconFrameKey(node({ icon: undefined }))).toBeNull();
  });
});

describe('borderFrameKey', () => {
  it('maps node kind + state to the frame atlas key', () => {
    expect(borderFrameKey('small', 'unallocated')).toBe('frame:PSSkillFrame');
    expect(borderFrameKey('small', 'canAllocate')).toBe('frame:PSSkillFrameHighlighted');
    expect(borderFrameKey('small', 'allocated')).toBe('frame:PSSkillFrameActive');
    expect(borderFrameKey('notable', 'canAllocate')).toBe('frame:NotableFrameCanAllocate');
    expect(borderFrameKey('keystone', 'allocated')).toBe('frame:KeystoneFrameAllocated');
    expect(borderFrameKey('jewel', 'unallocated')).toBe('frame:JewelFrameUnallocated');
    expect(borderFrameKey('ascendancyStart', 'allocated')).toBe('frame:AscendancyStartNode');
    expect(borderFrameKey('classStart', 'allocated')).toBeNull();
  });
});

describe('background art helpers', () => {
  const tree = {
    classes: [
      { name: 'Witch', base_str: 0, base_dex: 0, base_int: 0, ascendancies: [{ id: 'Witch1', name: 'Infernalist' }, { id: 'Witch2', name: 'B' }] },
      { name: 'Ranger', base_str: 0, base_dex: 0, base_int: 0, ascendancies: [{ id: 'Ranger1', name: 'Deadeye' }, { id: 'Ranger2', name: 'C' }, { id: 'Ranger3', name: 'D' }] },
    ],
  } as unknown as TreeData;

  it('names the per-class atlas in lower case', () => {
    expect(backgroundAtlasName(tree, 'Ranger1')).toBe('background-ranger');
    expect(backgroundAtlasName(tree, 'Witch2')).toBe('background-witch');
    expect(backgroundAtlasName(tree, 'Nope1')).toBeNull();
  });

  it('maps an ascendancy to its 1-based Class<n> backdrop frame', () => {
    expect(backgroundFrameKey(tree, 'Ranger1')).toBe('classRanger:Class1');
    expect(backgroundFrameKey(tree, 'Ranger3')).toBe('classRanger:Class3');
    expect(backgroundFrameKey(tree, 'Witch2')).toBe('classWitch:Class2');
    expect(backgroundFrameKey(tree, 'Nope1')).toBeNull();
  });
});

describe('loadTreeData', () => {
  it('fetches data.json and indexes it', async () => {
    const raw = {
      classes: [], min_x: 0, min_y: 0, max_x: 1, max_y: 1,
      nodes: { '7': { id: 'a', name: 'A', x: 0, y: 0, in: [], out: [] } },
    };
    const fakeFetch = async (url: string) => {
      expect(url).toBe('/tree/0.5.2/data.json');
      return { ok: true, json: async () => raw } as Response;
    };
    const tree = await loadTreeData(fakeFetch as typeof fetch);
    expect(tree.nodesBySkill.size).toBe(1);
    expect(tree.nodesById.get('a')!.skill).toBe(7);
  });
});

describe('loadAtlasFrames', () => {
  it('normalizes frames into a flat rect map', async () => {
    const atlas = { frames: { 'frame:PSSkillFrame': { frame: { x: 1, y: 2, w: 3, h: 4 } } }, meta: {} };
    const fakeFetch = async (url: string) => {
      expect(url).toBe('/tree/0.5.2/assets/frame.json');
      return { ok: true, json: async () => atlas } as Response;
    };
    const frames = await loadAtlasFrames('frame', fakeFetch as typeof fetch);
    expect(frames.get('frame:PSSkillFrame')).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });
});
