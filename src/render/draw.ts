import type { TreeData } from '../tree/types';
import { nodeKind } from '../tree/data';
import { iconFrameKey, borderFrameKey } from '../tree/source';
import type { Atlas } from '../tree/source';
import { visualState } from './nodeVisual';
import { lodFor, NODE_WORLD_RADIUS } from './lod';
import { worldToScreen, visibleWorldRect } from './viewport';
import type { Viewport, Size } from './viewport';
import { queryRect } from './spatialIndex';
import type { SpatialIndex } from './spatialIndex';
import { edgeGeometry } from './arc';
import type { AscendancyLayout } from './ascendancy';

// Concrete hex kept in sync by hand with the CSS palette in src/index.css.
const BG = '#0a0806'; // --void
const EDGE_DIM = 'rgba(122,108,78,0.20)';
const EDGE_ON = 'rgba(200,168,106,0.92)'; // shared / untagged — gold (--gold)
const EDGE_SET1 = 'rgba(215,96,80,0.92)'; // weapon set 1 — blood (--blood-lit)
const EDGE_SET2 = 'rgba(90,168,90,0.92)'; // weapon set 2 — jade (--jade)
const DOT_COLOR = { allocated: '#ecd49a', canAllocate: '#8a7d5a', unallocated: '#3c3424' } as const;

/** Colour an allocated edge by the weapon-set tag of either endpoint (the path "going to" a set). */
function edgeColor(weaponSets: Map<number, number> | undefined, a: number, b: number): string {
  const set = weaponSets?.get(a) ?? weaponSets?.get(b);
  return set === 1 ? EDGE_SET1 : set === 2 ? EDGE_SET2 : EDGE_ON;
}
const DIM_ALPHA = 0.35;
const ICON_SCALE = 1.4; // icon diameter as a multiple of node radius; drawn behind the frame
const BG_ART_ALPHA = 0.3;

export interface DrawParams {
  tree: TreeData;
  index: SpatialIndex;
  vp: Viewport;
  size: Size;
  allocated: Set<number>;
  startSkill: number | null;
  blocked?: Set<number>;
  hover: number | null;
  skills: Atlas;
  frames: Atlas;
  dimmed?: Set<number>;
  ascendancy?: AscendancyLayout | null;
  background?: Atlas | null;
  backgroundKey?: string | null;
  weaponSets?: Map<number, number>;
}

export function drawTree(ctx: CanvasRenderingContext2D, p: DrawParams): void {
  const { tree, index, vp, size, allocated, startSkill, hover, skills, frames, dimmed, ascendancy, background, backgroundKey, weaponSets } = p;
  const blocked = p.blocked ?? new Set<number>();
  const mainSet = new Set(tree.mainSkills);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size.width, size.height);

  const world = visibleWorldRect(vp, size);
  const pad = 300;
  const visible = queryRect(index, {
    minX: world.minX - pad, minY: world.minY - pad, maxX: world.maxX + pad, maxY: world.maxY + pad,
  });
  const lod = lodFor(vp.zoom);
  const start = startSkill ?? -1;

  // Edges — dedup by only drawing neighbour > skill. Skipped at the dots LOD.
  // Neighbours absent from the main render set (ascendancy connectors, decoration) are skipped,
  // which removes the phantom long-distance lines. Same-group/orbit edges draw as arcs.
  if (lod !== 'dots') {
    ctx.lineWidth = Math.max(1, 6 * vp.zoom);
    for (const skill of visible) {
      const a = tree.nodesBySkill.get(skill)!;
      for (const nb of tree.adjacency.get(skill) ?? []) {
        if (nb <= skill) continue;
        if (!mainSet.has(nb)) continue;
        const b = tree.nodesBySkill.get(nb);
        if (!b) continue;
        ctx.strokeStyle = allocated.has(skill) && allocated.has(nb) ? edgeColor(weaponSets, skill, nb) : EDGE_DIM;
        const geom = edgeGeometry(a, b, tree.groups);
        ctx.beginPath();
        if (geom.kind === 'arc') {
          const c = worldToScreen(vp, size, geom.cx, geom.cy);
          ctx.arc(c.sx, c.sy, geom.r * vp.zoom, geom.a0, geom.a1, geom.anticlockwise);
        } else {
          const pa = worldToScreen(vp, size, a.x, a.y);
          const pb = worldToScreen(vp, size, b.x, b.y);
          ctx.moveTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
        }
        ctx.stroke();
      }
    }
  }

  // Nodes.
  for (const skill of visible) {
    const n = tree.nodesBySkill.get(skill)!;
    const kind = nodeKind(n);
    const state = visualState(tree, allocated, start, skill, blocked);
    const s = worldToScreen(vp, size, n.x, n.y);
    const r = NODE_WORLD_RADIUS[kind] * vp.zoom;
    ctx.globalAlpha = dimmed?.has(skill) ? DIM_ALPHA : 1;

    if (lod === 'dots') {
      ctx.fillStyle = DOT_COLOR[state];
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, Math.max(1.2, r * 0.5), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // Class-start nodes: a small neutral dot, no icon and no border frame.
    if (kind === 'classStart') {
      ctx.fillStyle = '#7a6e4e';
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, Math.max(2, r * 0.35), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const iconKey = iconFrameKey(n);
    if (iconKey) {
      const ir = skills.frames.get(iconKey);
      if (ir) {
        const id = r * ICON_SCALE;
        ctx.drawImage(skills.image, ir.x, ir.y, ir.w, ir.h, s.sx - id / 2, s.sy - id / 2, id, id);
      }
    }

    const frameKey = borderFrameKey(kind, state);
    if (frameKey) {
      const fr = frames.frames.get(frameKey);
      if (fr) ctx.drawImage(frames.image, fr.x, fr.y, fr.w, fr.h, s.sx - r, s.sy - r, r * 2, r * 2);
    }
  }
  ctx.globalAlpha = 1;

  // Hover ring (main tree only; overlay draws its own below).
  if (hover != null && !(ascendancy && ascendancy.bySkill.has(hover))) {
    const n = tree.nodesBySkill.get(hover);
    if (n) {
      const s = worldToScreen(vp, size, n.x, n.y);
      const r = NODE_WORLD_RADIUS[nodeKind(n)] * vp.zoom;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Ascendancy overlay — a world-anchored second pass centred on the tree hub (0,0),
  // so it pans and zooms with the tree. Projected through worldToScreen like everything else.
  if (ascendancy) {
    const start2 = startSkill ?? -1;
    const c = worldToScreen(vp, size, ascendancy.cx, ascendancy.cy);

    // Faint backing disc — separates the overlay from the main tree and is the fallback
    // when the background art is unavailable.
    ctx.fillStyle = 'rgba(10,11,16,0.85)';
    ctx.beginPath();
    ctx.arc(c.sx, c.sy, ascendancy.radius * vp.zoom, 0, Math.PI * 2);
    ctx.fill();

    // Background art (the class-specific circular backdrop), behind the nodes.
    if (background && backgroundKey) {
      const fr = background.frames.get(backgroundKey);
      if (fr) {
        const side = ascendancy.bgSize * vp.zoom;
        ctx.globalAlpha = BG_ART_ALPHA;
        ctx.drawImage(background.image, fr.x, fr.y, fr.w, fr.h, c.sx - side / 2, c.sy - side / 2, side, side);
        ctx.globalAlpha = 1;
      }
    }

    // Intra-ascendancy edges (straight is fine inside the small ring).
    ctx.lineWidth = Math.max(1, 6 * vp.zoom);
    for (const nl of ascendancy.nodes) {
      const a = worldToScreen(vp, size, nl.wx, nl.wy);
      for (const nb of tree.adjacency.get(nl.skill) ?? []) {
        if (nb <= nl.skill) continue;
        const bl = ascendancy.bySkill.get(nb);
        if (!bl) continue;
        const b = worldToScreen(vp, size, bl.wx, bl.wy);
        ctx.strokeStyle = allocated.has(nl.skill) && allocated.has(nb) ? edgeColor(weaponSets, nl.skill, nb) : EDGE_DIM;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    }

    // Icons (behind) + frames (on top).
    for (const nl of ascendancy.nodes) {
      const n = tree.nodesBySkill.get(nl.skill)!;
      const kind = nodeKind(n);
      const state = visualState(tree, allocated, start2, nl.skill, blocked);
      const s = worldToScreen(vp, size, nl.wx, nl.wy);
      const r = nl.wr * vp.zoom;
      const iconKey = iconFrameKey(n);
      if (iconKey) {
        const ir = skills.frames.get(iconKey);
        if (ir) {
          const id = r * ICON_SCALE;
          ctx.drawImage(skills.image, ir.x, ir.y, ir.w, ir.h, s.sx - id / 2, s.sy - id / 2, id, id);
        }
      }
      const frameKey = borderFrameKey(kind, state);
      if (frameKey) {
        const fr = frames.frames.get(frameKey);
        if (fr) ctx.drawImage(frames.image, fr.x, fr.y, fr.w, fr.h, s.sx - r, s.sy - r, r * 2, r * 2);
      }
    }

    // Overlay hover ring.
    if (hover != null && ascendancy.bySkill.has(hover)) {
      const nl = ascendancy.bySkill.get(hover)!;
      const s = worldToScreen(vp, size, nl.wx, nl.wy);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, nl.wr * vp.zoom + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
