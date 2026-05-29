import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../state';
import { searchGems } from '../gems';
import type { GemColor, GemType } from '../gems';
import { GemIcon } from '../icons';

const overlay: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
};
const modal: CSSProperties = {
  width: 420, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
  background: 'linear-gradient(180deg, #241c10, #120d07)',
  border: '1px solid var(--bronze)', borderTopColor: 'var(--bronze-lit)', borderRadius: 5,
  padding: 14, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
  boxShadow: 'var(--shadow)',
};
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '5px 7px', textAlign: 'left', cursor: 'pointer',
};

// R/G/B/W filter swatches, tinted to the gem socket colours.
const COLORS: { key: GemColor; label: string; hex: string }[] = [
  { key: 'r', label: 'R', hex: '#c8503e' },
  { key: 'g', label: 'G', hex: '#5aa85a' },
  { key: 'b', label: 'B', hex: '#5683c0' },
  { key: 'w', label: 'W', hex: '#d8cba0' },
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
          {COLORS.map((c) => {
            const on = color === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setColor(on ? undefined : c.key)}
                style={{
                  minWidth: 30,
                  color: on ? c.hex : 'var(--text-muted)',
                  borderColor: on ? c.hex : 'var(--line)',
                  fontWeight: on ? 700 : 600,
                  boxShadow: on ? `0 0 8px ${c.hex}` : undefined,
                }}
              >
                {c.label}
              </button>
            );
          })}
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.map((g) => (
            <button
              key={g.id}
              className="gem-row"
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
