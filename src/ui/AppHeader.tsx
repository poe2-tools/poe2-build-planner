import type { CSSProperties } from 'react';
import { useStore } from '../state';
import LoadSave from './LoadSave';

export type Screen = 'tree' | 'skills' | 'items' | 'build';

const TABS: [Screen, string][] = [
  ['tree', 'Passive Tree'],
  ['skills', 'Skills'],
  ['items', 'Items'],
  ['build', 'Build'],
];

const header: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px', height: 44, flexShrink: 0,
  background: 'rgba(20,22,30,0.96)', borderBottom: '1px solid #2a2d3a', color: '#ddd', font: '13px sans-serif',
};
const name: CSSProperties = {
  color: '#e8e6df', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
};
const tabRow: CSSProperties = { display: 'flex', alignItems: 'stretch', height: '100%', flex: 1 };
const tabBase: CSSProperties = {
  background: 'none', border: 'none', color: '#9aa0b4', cursor: 'pointer', padding: '0 16px',
  font: '13px sans-serif', borderBottom: '2px solid transparent',
};
const tabActive: CSSProperties = { color: '#d9c25a', fontWeight: 700, borderBottom: '2px solid #d9c25a' };

interface Props {
  active: Screen;
  onSelect: (s: Screen) => void;
}

export default function AppHeader({ active, onSelect }: Props) {
  const buildName = useStore((s) => s.build.name);
  return (
    <div style={header}>
      <strong style={name}>{buildName || 'Untitled build'}</strong>
      <div style={tabRow}>
        {TABS.map(([s, label]) => (
          <button key={s} onClick={() => onSelect(s)} style={{ ...tabBase, ...(active === s ? tabActive : null) }}>
            {label}
          </button>
        ))}
      </div>
      <LoadSave />
    </div>
  );
}
