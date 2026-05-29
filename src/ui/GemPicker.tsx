import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../state';
import { searchGems } from '../gems';
import type { GemColor, GemType } from '../gems';
import { GemIcon } from '../icons';

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
};
const modal: CSSProperties = {
  width: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
  background: '#1a1c24', color: '#ddd', borderRadius: 8, padding: 12, font: '13px sans-serif',
};
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '4px 6px', background: 'none', border: 'none', color: '#ddd',
  textAlign: 'left', cursor: 'pointer',
};

const COLORS: { key: GemColor; label: string }[] = [
  { key: 'r', label: 'R' },
  { key: 'g', label: 'G' },
  { key: 'b', label: 'B' },
  { key: 'w', label: 'W' },
];

interface Props {
  role: 'skill' | 'support';
  onPick: (gemId: string) => void;
  onClose: () => void;
}

export default function GemPicker({ role, onPick, onClose }: Props) {
  const gems = useStore((s) => s.gems);
  const [query, setQuery] = useState('');
  const [color, setColor] = useState<GemColor | undefined>(undefined);

  if (!gems) return null;
  const allow: GemType[] = role === 'support' ? ['support'] : ['active', 'spirit'];
  const results = searchGems(gems, { query, color }).filter((g) => allow.includes(g.gemType)).slice(0, 100);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input
            autoFocus
            placeholder="Search gems…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          {COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(color === c.key ? undefined : c.key)}
              style={{ fontWeight: color === c.key ? 'bold' : 'normal' }}
            >
              {c.label}
            </button>
          ))}
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                onPick(g.id);
                onClose();
              }}
              style={row}
            >
              <GemIcon iconDdsFile={g.iconDdsFile} size={24} />
              <span>{g.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
