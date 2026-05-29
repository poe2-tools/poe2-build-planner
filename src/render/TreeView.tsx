import { useEffect, useMemo, useRef, useState } from 'react';
import type { TreeData } from '../tree/types';
import { loadAtlas, backgroundAtlasName, backgroundFrameKey } from '../tree/source';
import type { Atlas } from '../tree/source';
import { buildSpatialIndex, nodeAt } from './spatialIndex';
import type { SpatialIndex } from './spatialIndex';
import { fitToBounds, screenToWorld } from './viewport';
import type { Viewport, Size } from './viewport';
import { drawTree } from './draw';
import { ascendancyLayout, hitAscendancy } from './ascendancy';
import type { AscendancyLayout } from './ascendancy';
import NodeTooltip from './NodeTooltip';
import NodeNoteEditor from './NodeNoteEditor';
import type { Passive } from '../buildfile';

interface Props {
  tree: TreeData;
  skills: Atlas;
  frames: Atlas;
  allocated: Set<number>;
  startSkill: number | null;
  blocked: Set<number>;
  dimmed: Set<number>;
  entries: Map<number, Passive>;
  onSetNote: (skill: number, text: string) => void;
  ascendancyId: string | undefined;
  onNodeClick: (skill: number) => void;
}

const HIT_RADIUS_PX = 30;
const CLICK_SLOP_PX = 5;

export default function TreeView({ tree, skills, frames, allocated, startSkill, blocked, dimmed, entries, onSetNote, ascendancyId, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indexRef = useRef<SpatialIndex>(buildSpatialIndex(tree));
  const vpRef = useRef<Viewport>({ x: 0, y: 0, zoom: 0.1 });
  const sizeRef = useRef<Size>({ width: 0, height: 0 });
  const hoverRef = useRef<number | null>(null);
  const dirtyRef = useRef(true);
  const fittedRef = useRef(false);
  const dragRef = useRef<{ x: number; y: number; moved: number } | null>(null);
  const overlayRef = useRef<AscendancyLayout | null>(null);
  const tipRef = useRef<number | null>(null);
  const [tip, setTip] = useState<{ skill: number; x: number; y: number } | null>(null);
  const [noteEditor, setNoteEditor] = useState<{ skill: number; x: number; y: number } | null>(null);
  const [bgAtlas, setBgAtlas] = useState<Atlas | null>(null);
  const bgKey = ascendancyId ? backgroundFrameKey(tree, ascendancyId) : null;

  // Per-node weapon-set tags (skill -> 1|2) for colouring allocated edges.
  const weaponSets = useMemo(() => {
    const m = new Map<number, number>();
    for (const [skill, p] of entries) if (p.weapon_set) m.set(skill, p.weapon_set);
    return m;
  }, [entries]);

  // Latest draw inputs + click handler, read by the rAF loop / listeners (refs avoid re-subscribing).
  const drawRef = useRef({ tree, skills, frames, allocated, startSkill, blocked, dimmed, ascendancyId, bgAtlas, bgKey, weaponSets });
  drawRef.current = { tree, skills, frames, allocated, startSkill, blocked, dimmed, ascendancyId, bgAtlas, bgKey, weaponSets };
  const clickRef = useRef(onNodeClick);
  clickRef.current = onNodeClick;

  // Rebuild the spatial index + refit when the tree identity changes.
  useEffect(() => {
    indexRef.current = buildSpatialIndex(tree);
    fittedRef.current = false;
    dirtyRef.current = true;
  }, [tree]);

  // Any draw-input change requests a repaint.
  useEffect(() => {
    dirtyRef.current = true;
  }, [tree, skills, frames, allocated, startSkill, blocked, dimmed, ascendancyId, bgAtlas, weaponSets]);

  // Lazily load the selected class's background-art atlas; clears when no ascendancy.
  useEffect(() => {
    setBgAtlas(null);
    if (!ascendancyId) return;
    const name = backgroundAtlasName(tree, ascendancyId);
    if (!name) return;
    let cancelled = false;
    loadAtlas(name)
      .then((a) => { if (!cancelled) setBgAtlas(a); })
      .catch(() => { /* fall back to the faint disc */ });
    return () => { cancelled = true; };
  }, [tree, ascendancyId]);

  // Mount-only: canvas sizing, listeners, and the rAF loop.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { width: rect.width, height: rect.height };
      if (!fittedRef.current && rect.width > 0) {
        vpRef.current = fitToBounds(drawRef.current.tree.bounds, sizeRef.current);
        fittedRef.current = true;
      }
      dirtyRef.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = vpRef.current;
      const size = sizeRef.current;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const before = screenToWorld(vp, size, sx, sy);
      vp.zoom = Math.max(0.01, Math.min(3, vp.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      const after = screenToWorld(vp, size, sx, sy);
      vp.x += before.wx - after.wx;
      vp.y += before.wy - after.wy;
      dirtyRef.current = true;
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const loop = () => {
      if (dirtyRef.current) {
        const d = drawRef.current;
        const overlay = d.ascendancyId ? ascendancyLayout(d.tree, d.ascendancyId) : null;
        overlayRef.current = overlay;
        drawTree(ctx, {
          tree: d.tree, index: indexRef.current, vp: vpRef.current, size: sizeRef.current,
          allocated: d.allocated, startSkill: d.startSkill, blocked: d.blocked, hover: hoverRef.current,
          skills: d.skills, frames: d.frames, dimmed: d.dimmed, ascendancy: overlay,
          background: d.bgAtlas, backgroundKey: d.bgKey, weaponSets: d.weaponSets,
        });
        dirtyRef.current = false;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Pick the node under a screen point. Inside the world-anchored ascendancy disc only its
  // nodes are selectable (the disc masks the main tree behind it); otherwise pick a main node.
  const pickAt = (sx: number, sy: number): number | null => {
    const vp = vpRef.current;
    const w = screenToWorld(vp, sizeRef.current, sx, sy);
    const overlay = overlayRef.current;
    if (overlay) {
      const dx = w.wx - overlay.cx;
      const dy = w.wy - overlay.cy;
      if (dx * dx + dy * dy <= overlay.radius * overlay.radius) {
        return hitAscendancy(overlay, w.wx, w.wy, vp.zoom);
      }
    }
    return nodeAt(indexRef.current, drawRef.current.tree, w.wx, w.wy, HIT_RADIUS_PX / vp.zoom);
  };

  const clearTip = () => {
    if (tipRef.current !== null) {
      tipRef.current = null;
      setTip(null);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // right/middle button: handled by onContextMenu, never toggles allocation
    setNoteEditor(null);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const vp = vpRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const drag = dragRef.current;
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      vp.x -= dx / vp.zoom;
      vp.y -= dy / vp.zoom;
      dirtyRef.current = true;
      clearTip();
      return;
    }
    const hit = pickAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit !== hoverRef.current) {
      hoverRef.current = hit;
      dirtyRef.current = true;
    }
    // Class-start nodes stay hoverable/clickable but show no tooltip (no name/stats to show).
    if (hit === null || tree.nodesBySkill.get(hit)?.classStartIndex !== undefined) {
      clearTip();
    } else {
      tipRef.current = hit;
      setTip({ skill: hit, x: e.clientX, y: e.clientY });
    }
  };

  const onPointerLeave = () => {
    if (hoverRef.current !== null) {
      hoverRef.current = null;
      dirtyRef.current = true;
    }
    clearTip();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.moved >= CLICK_SLOP_PX) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const hit = pickAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit !== null) clickRef.current(hit);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // suppress the browser context menu
    const rect = e.currentTarget.getBoundingClientRect();
    const hit = pickAt(e.clientX - rect.left, e.clientY - rect.top);
    if (hit !== null && allocated.has(hit)) {
      clearTip();
      setNoteEditor({ skill: hit, x: e.clientX, y: e.clientY });
    } else {
      setNoteEditor(null);
    }
  };

  const tipNode = tip ? tree.nodesBySkill.get(tip.skill) ?? null : null;
  const tipEntry = tip ? entries.get(tip.skill) : undefined;

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={onContextMenu}
      />
      {tip && tipNode && (
        <NodeTooltip node={tipNode} x={tip.x} y={tip.y} note={tipEntry?.additional_text} weaponSet={tipEntry?.weapon_set} allocated={allocated.has(tip.skill)} />
      )}
      {noteEditor && (
        <NodeNoteEditor
          x={noteEditor.x}
          y={noteEditor.y}
          initialText={entries.get(noteEditor.skill)?.additional_text ?? ''}
          onSave={(text) => {
            onSetNote(noteEditor.skill, text);
            setNoteEditor(null);
          }}
          onCancel={() => setNoteEditor(null)}
        />
      )}
    </>
  );
}
