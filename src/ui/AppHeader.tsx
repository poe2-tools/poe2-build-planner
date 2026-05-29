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
  display: 'flex', alignItems: 'stretch', gap: 18, padding: '0 16px', height: 52, flexShrink: 0,
  background: 'linear-gradient(180deg, rgba(30,23,13,0.97), rgba(14,10,6,0.97))',
  borderBottom: '1px solid var(--bronze)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
};
const name: CSSProperties = {
  display: 'flex', alignItems: 'center',
  color: 'var(--gold-bright)', fontFamily: 'var(--font-display)', fontWeight: 700,
  fontSize: 17, letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.7)',
  whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis',
};
const tabRow: CSSProperties = { display: 'flex', alignItems: 'stretch', height: '100%', flex: 1, gap: 2 };
const tabBase: CSSProperties = {
  background: 'none', border: 'none', borderRadius: 0, color: 'var(--text-muted)', cursor: 'pointer',
  padding: '0 18px', textTransform: 'uppercase', letterSpacing: '0.1em',
  // longhand (not the `font` shorthand) so merging in tabActive's fontWeight doesn't trip
  // React's shorthand/non-shorthand conflict warning on tab switch.
  fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 600,
  borderBottom: '2px solid transparent', transition: 'color 120ms ease',
};
const tabActive: CSSProperties = {
  color: 'var(--gold-bright)', fontWeight: 700, borderBottom: '2px solid var(--gold)',
  textShadow: '0 0 10px rgba(200,168,106,0.4)',
};

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
