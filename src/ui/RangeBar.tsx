import type { CSSProperties } from 'react';
import { useStore } from '../state';
import type { Domain } from '../state';
import IntervalInputs from './IntervalInputs';

const bar: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  padding: 6, marginBottom: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 6,
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
  const renameRange = useStore((s) => s.renameRange);
  const setRangeInterval = useStore((s) => s.setRangeInterval);
  const setActiveRange = useStore((s) => s.setActiveRange);

  const active = ranges.find((r) => r.id === activeId);

  return (
    <div style={bar}>
      <select value={activeId} onChange={(e) => setActiveRange(domain, e.target.value)}>
        {ranges.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}{r.interval ? ` (${r.interval[0]}–${r.interval[1]})` : ''}
          </option>
        ))}
      </select>
      <button onClick={() => addRange(domain)} title="New empty range">＋</button>
      <button onClick={() => duplicateRange(domain, activeId)} title="Duplicate this range">⧉</button>
      {active && !active.isDefault && (
        <>
          <input
            value={active.name}
            onChange={(e) => renameRange(domain, activeId, e.target.value)}
            style={{ width: 110 }}
            placeholder="Range name"
          />
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
