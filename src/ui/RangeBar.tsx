import type { CSSProperties } from 'react';
import { useStore, rangeLabel } from '../state';
import type { Domain } from '../state';
import IntervalInputs from './IntervalInputs';

const bar: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  padding: 6, marginBottom: 8, background: 'rgba(12,10,6,0.55)',
  border: '1px solid var(--line)', borderRadius: 4,
};

interface Props {
  domain: Domain;
}

export default function RangeBar({ domain }: Props) {
  const ranges = useStore((s) => (domain === 'passives' ? s.passiveRanges : domain === 'skills' ? s.skillRanges : s.itemRanges));
  const activeId = useStore((s) => (domain === 'passives' ? s.activePassiveId : domain === 'skills' ? s.activeSkillId : s.activeItemId));
  const addRange = useStore((s) => s.addRange);
  const duplicateRange = useStore((s) => s.duplicateRange);
  const deleteRange = useStore((s) => s.deleteRange);
  const setRangeInterval = useStore((s) => s.setRangeInterval);
  const setActiveRange = useStore((s) => s.setActiveRange);

  const active = ranges.find((r) => r.id === activeId);

  return (
    <div style={bar}>
      <select value={activeId} onChange={(e) => setActiveRange(domain, e.target.value)}>
        {ranges.map((r) => (
          <option key={r.id} value={r.id}>
            {rangeLabel(r)}
          </option>
        ))}
      </select>
      <button onClick={() => addRange(domain)} title="New empty range">＋</button>
      <button onClick={() => duplicateRange(domain, activeId)} title="Duplicate this range">⧉</button>
      {active && !active.isDefault && (
        <>
          <IntervalInputs
            value={active.interval ?? undefined}
            onChange={(iv) => setRangeInterval(domain, activeId, iv ?? [1, 10])}
          />
          <button onClick={() => deleteRange(domain, activeId)} title="Delete this range">🗑</button>
        </>
      )}
    </div>
  );
}
