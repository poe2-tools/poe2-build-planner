import type { CSSProperties } from 'react';
import { useStore } from '../state';
import type { WeaponSet } from '../state';

const OPTIONS: [WeaponSet, string][] = [[0, 'Default'], [1, 'Weapon Set 1'], [2, 'Weapon Set 2']];
// Mirror the tree's edge colours: shared = gold, set 1 = blood, set 2 = jade.
const TINT: Record<WeaponSet, string> = { 0: 'var(--gold-bright)', 1: 'var(--blood-lit)', 2: 'var(--jade)' };
const row: CSSProperties = { display: 'flex', gap: 4, marginTop: 6 };

export default function WeaponSetToggle() {
  const active = useStore((s) => s.activeWeaponSet);
  const setActive = useStore((s) => s.setActiveWeaponSet);
  return (
    <div style={row}>
      {OPTIONS.map(([v, label]) => {
        const on = active === v;
        return (
          <button
            key={v}
            onClick={() => setActive(v)}
            style={{
              flex: 1, fontSize: 11, padding: '5px 4px',
              color: on ? TINT[v] : 'var(--text-muted)',
              borderColor: on ? TINT[v] : 'var(--line)',
              fontWeight: on ? 700 : 600,
              boxShadow: on ? `0 0 9px ${TINT[v]}, inset 0 1px 0 rgba(236,212,154,0.1)` : undefined,
              opacity: on ? 1 : 0.7,
            }}
            title={v === 0 ? 'Untagged — applies to both weapon sets' : `Tag newly-allocated nodes to weapon set ${v}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
