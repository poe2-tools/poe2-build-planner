import { useState } from 'react';
import type { CSSProperties } from 'react';
import MarkupEditor from '../ui/MarkupEditor';

interface Props {
  x: number;
  y: number;
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

const OFFSET = 16;
const WIDTH = 300;

export default function NodeNoteEditor({ x, y, initialText, onSave, onCancel }: Props) {
  const [text, setText] = useState(initialText);
  const flipX = x + OFFSET + WIDTH > window.innerWidth;
  const style: CSSProperties = {
    position: 'fixed',
    top: y + OFFSET,
    left: flipX ? undefined : x + OFFSET,
    right: flipX ? window.innerWidth - x + OFFSET : undefined,
    width: WIDTH,
    background: 'rgba(12,13,18,0.98)',
    border: '1px solid #3a3d4e',
    borderRadius: 6,
    padding: 10,
    zIndex: 60,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };
  return (
    // stopPropagation so interacting with the editor never reaches the canvas handlers
    <div
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <MarkupEditor
        value={text}
        onChange={setText}
        minRows={3}
        placeholder="Note (saved as additional_text)…"
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={() => onSave(text)}>Save</button>
      </div>
    </div>
  );
}
