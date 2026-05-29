import type { CSSProperties } from 'react';
import { useStore } from '../state';
import { pointsUsed } from '../tree';

const EMPTY: Set<number> = new Set();

const panel: CSSProperties = {
  position: 'absolute', top: 12, left: 12, padding: '10px 14px',
  color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 7,
  fontFamily: 'var(--font-body)', fontSize: 13, minWidth: 188,
};
const labelRow: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3 };
const labelText: CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'var(--text-muted)',
};
const stat: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12 };
const statVal: CSSProperties = { color: 'var(--gold-bright)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' };

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
    <div className="panel" style={panel}>
      <label style={labelRow}>
        <span style={labelText}>Class</span>
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
      <label style={labelRow}>
        <span style={labelText}>Ascendancy</span>
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
      <hr className="gilt-rule" style={{ margin: '2px 0' }} />
      <div style={stat}><span style={labelText}>Passive</span><span style={statVal}>{totals.main}</span></div>
      <div style={stat}><span style={labelText}>Ascendancy</span><span style={statVal}>{totals.ascendancy}</span></div>
    </div>
  );
}
