import type { CSSProperties } from 'react';
import { useStore } from '../state';
import type { WeaponSet } from '../state';

const OPTIONS: [WeaponSet, string][] = [[0, 'Default'], [1, 'Weapon Set 1'], [2, 'Weapon Set 2']];
const row: CSSProperties = { display: 'flex', gap: 4, marginTop: 4 };

export default function WeaponSetToggle() {
  const active = useStore((s) => s.activeWeaponSet);
  const setActive = useStore((s) => s.setActiveWeaponSet);
  return (
    <div style={row}>
      {OPTIONS.map(([v, label]) => (
        <button
          key={v}
          onClick={() => setActive(v)}
          style={{ flex: 1, fontWeight: active === v ? 'bold' : 'normal', opacity: active === v ? 1 : 0.6 }}
          title={v === 0 ? 'Untagged — applies to both weapon sets' : `Tag newly-allocated nodes to weapon set ${v}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
