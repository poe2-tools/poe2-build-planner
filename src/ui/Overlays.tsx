import type { CSSProperties } from 'react';
import { useStore } from '../state';
import { pointsUsed } from '../tree';

const EMPTY: Set<number> = new Set();

const panel: CSSProperties = {
  position: 'absolute', top: 8, left: 8, padding: '8px 12px',
  background: 'rgba(20,22,30,0.85)', color: '#ddd', borderRadius: 6,
  display: 'flex', flexDirection: 'column', gap: 6, font: '13px sans-serif',
};

export default function Overlays() {
  const tree = useStore((s) => s.tree);
  const classIndex = useStore((s) => s.classIndex);
  const ascendancy = useStore((s) => s.build.ascendancy);
  const allocated = useStore((s) => s.passiveRanges.find((r) => r.id === s.activePassiveId)?.allocated ?? EMPTY);
  const setClass = useStore((s) => s.setClass);
  const setAscendancy = useStore((s) => s.setAscendancy);

  if (!tree) return null;
  const totals = pointsUsed(tree, allocated);
  const ascendancies = classIndex >= 0 ? tree.classes[classIndex].ascendancies : [];

  return (
    <div style={panel}>
      <label>
        Class{' '}
        <select value={classIndex} onChange={(e) => setClass(Number(e.target.value))}>
          <option value={-1} disabled>Select…</option>
          {tree.classes
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => c.ascendancies.length > 0)
            .map(({ c, i }) => (
              <option key={i} value={i}>{c.name}</option>
            ))}
        </select>
      </label>
      <label>
        Ascendancy{' '}
        <select
          value={ascendancy ?? ''}
          onChange={(e) => setAscendancy(e.target.value)}
          disabled={ascendancies.length === 0}
        >
          <option value="">None</option>
          {ascendancies.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
      <div>Passive points: {totals.main}</div>
      <div>Ascendancy points: {totals.ascendancy}</div>
    </div>
  );
}
