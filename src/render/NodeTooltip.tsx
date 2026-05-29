import type { TreeNode } from '../tree/types';
import { cleanStatText } from './statText';
import MarkupPreview from '../ui/MarkupPreview';

interface Props {
  node: TreeNode;
  x: number;
  y: number;
  note?: string;
  weaponSet?: number;
}

const OFFSET = 16;
const WIDTH = 320;

const badge: React.CSSProperties = {
  marginLeft: 8,
  padding: '1px 6px',
  borderRadius: 4,
  background: 'rgba(196,170,86,0.25)',
  border: '1px solid #8a7a3a',
  color: '#d9c25a',
  fontSize: 11,
  fontWeight: 600,
  verticalAlign: 'middle',
};

export default function NodeTooltip({ node, x, y, note, weaponSet }: Props) {
  // Flip to the cursor's left when the tooltip would overflow the right edge.
  const flipX = x + OFFSET + WIDTH > window.innerWidth;
  const style: React.CSSProperties = {
    position: 'fixed',
    top: y + OFFSET,
    left: flipX ? undefined : x + OFFSET,
    right: flipX ? window.innerWidth - x + OFFSET : undefined,
    maxWidth: WIDTH,
    pointerEvents: 'none',
    background: 'rgba(12,13,18,0.96)',
    border: '1px solid #3a3d4e',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#e8e6df',
    font: '13px/1.4 system-ui, sans-serif',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    whiteSpace: 'pre-line',
    zIndex: 50,
  };
  return (
    <div style={style}>
      <div style={{ fontWeight: 700, color: '#d9c25a', marginBottom: node.stats.length ? 6 : 0 }}>
        {node.name}
        {weaponSet ? <span style={badge}>Weapon Set {weaponSet}</span> : null}
      </div>
      {node.stats.map((s, i) => (
        <div key={i} style={{ color: '#b9c0d0' }}>
          {cleanStatText(s)}
        </div>
      ))}
      {note ? (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #3a3d4e', color: '#cfcf8a', fontStyle: 'italic' }}>
          <MarkupPreview text={note} />
        </div>
      ) : null}
    </div>
  );
}
