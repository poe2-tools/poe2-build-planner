import type { TreeNode } from '../tree/types';
import { cleanStatText } from './statText';
import MarkupPreview from '../ui/MarkupPreview';

interface Props {
  node: TreeNode;
  x: number;
  y: number;
  note?: string;
  weaponSet?: number;
  /** Allocated nodes can carry a note (added via right-click) — show the hint. */
  allocated?: boolean;
}

const OFFSET = 16;
const WIDTH = 320;

// Mirror the tree's edge colours: set 1 = blood, set 2 = jade.
const SET_TINT: Record<number, string> = { 1: 'var(--blood-lit)', 2: 'var(--jade)' };

export default function NodeTooltip({ node, x, y, note, weaponSet, allocated }: Props) {
  // Flip to the cursor's left when the tooltip would overflow the right edge.
  const flipX = x + OFFSET + WIDTH > window.innerWidth;
  const tint = (weaponSet && SET_TINT[weaponSet]) || 'var(--gold-bright)';
  const badge: React.CSSProperties = {
    marginLeft: 8,
    padding: '1px 6px',
    borderRadius: 3,
    background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${tint}`,
    color: tint,
    fontFamily: 'var(--font-display)',
    fontSize: 10,
    letterSpacing: '0.06em',
    fontWeight: 700,
    verticalAlign: 'middle',
  };
  const style: React.CSSProperties = {
    position: 'fixed',
    top: y + OFFSET,
    left: flipX ? undefined : x + OFFSET,
    right: flipX ? window.innerWidth - x + OFFSET : undefined,
    maxWidth: WIDTH,
    pointerEvents: 'none',
    background: 'rgba(16,12,7,0.97)',
    border: '1px solid var(--bronze)',
    borderTopColor: 'var(--bronze-lit)',
    borderRadius: 4,
    padding: '9px 11px',
    color: 'var(--text-bright)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    lineHeight: 1.45,
    boxShadow: 'var(--shadow)',
    whiteSpace: 'pre-line',
    zIndex: 50,
  };
  return (
    <div style={style}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.03em', color: 'var(--gold-bright)', marginBottom: node.stats.length ? 6 : 0 }}>
        {node.name}
        {weaponSet ? <span style={badge}>Set {weaponSet}</span> : null}
      </div>
      {node.stats.map((s, i) => (
        <div key={i} style={{ color: 'var(--text)' }}>
          {cleanStatText(s)}
        </div>
      ))}
      {note ? (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)', color: 'var(--gold)', fontStyle: 'italic' }}>
          <MarkupPreview text={note} />
        </div>
      ) : null}
      {allocated && !note ? (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)', color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>
          Right-click to add note
        </div>
      ) : null}
    </div>
  );
}
