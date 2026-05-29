import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useStore, dimmedByWeaponSet } from '../state';
import type { Atlas } from '../tree/source';
import type { Passive } from '../buildfile';
import TreeView from '../render/TreeView';
import Overlays from './Overlays';
import RangeBar from './RangeBar';
import WeaponSetToggle from './WeaponSetToggle';

const EMPTY: Set<number> = new Set();
const EMPTY_ENTRIES: Map<number, Passive> = new Map();
const passiveBar: CSSProperties = {
  // top-center of the tree area (below the header); clear of Overlays (top-left)
  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 340,
  color: 'var(--text)', padding: 8, fontFamily: 'var(--font-body)', fontSize: 13,
};

interface Props {
  skills: Atlas;
  frames: Atlas;
}

export default function TreeScreen({ skills, frames }: Props) {
  const tree = useStore((s) => s.tree)!; // App renders TreeScreen only after the tree is loaded
  const passiveRanges = useStore((s) => s.passiveRanges);
  const activePassiveId = useStore((s) => s.activePassiveId);
  const activeWeaponSet = useStore((s) => s.activeWeaponSet);
  const startSkill = useStore((s) => s.startSkill);
  const blocked = useStore((s) => s.blocked);
  const clickNode = useStore((s) => s.clickNode);
  const setNodeNote = useStore((s) => s.setNodeNote);
  const ascendancyId = useStore((s) => s.build.ascendancy);

  const activeRange = passiveRanges.find((r) => r.id === activePassiveId);
  const dimmed = useMemo(() => dimmedByWeaponSet(activeRange, activeWeaponSet), [activeRange, activeWeaponSet]);
  const allocated = activeRange?.allocated ?? EMPTY;
  const entries = activeRange?.entries ?? EMPTY_ENTRIES;

  return (
    <>
      <TreeView
        tree={tree}
        skills={skills}
        frames={frames}
        allocated={allocated}
        startSkill={startSkill}
        blocked={blocked}
        dimmed={dimmed}
        entries={entries}
        onSetNote={setNodeNote}
        ascendancyId={ascendancyId}
        onNodeClick={clickNode}
      />
      <div className="panel" style={passiveBar}>
        <RangeBar domain="passives" />
        <WeaponSetToggle />
      </div>
      <Overlays />
    </>
  );
}
