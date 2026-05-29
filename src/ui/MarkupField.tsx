import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import MarkupEditor from './MarkupEditor';
import MarkupPreview from './MarkupPreview';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Heading shown in the edit modal. */
  title?: string;
}

const row: CSSProperties = { display: 'flex', alignItems: 'stretch', gap: 6 };
const box: CSSProperties = {
  flex: 1, minHeight: 34, maxHeight: 120, overflow: 'auto', padding: '4px 6px', cursor: 'text',
  background: '#fbfbfd', color: '#1b1d24', border: '1px solid #c4c7d2', borderRadius: 4,
  font: '12px sans-serif', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};
const editBtn: CSSProperties = {
  alignSelf: 'flex-start', font: '11px sans-serif', padding: '3px 8px', cursor: 'pointer',
  background: '#f4f5f8', color: '#1b1d24', border: '1px solid #c4c7d2', borderRadius: 4,
};
const placeholderStyle: CSSProperties = { color: '#9aa0b4' };

const backdrop: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modal: CSSProperties = {
  width: 'min(520px, 92vw)', maxHeight: '85vh', overflow: 'auto',
  background: '#e8e9ee', color: '#1b1d24', border: '1px solid #c4c7d2', borderRadius: 8,
  padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const head: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };

export default function MarkupField({ value, onChange, placeholder, title }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div style={row}>
        <div style={box} onClick={() => setOpen(true)} title="Click to edit">
          {value ? <MarkupPreview text={value} /> : <span style={placeholderStyle}>{placeholder ?? 'Add note…'}</span>}
        </div>
        <button type="button" style={editBtn} onClick={() => setOpen(true)}>Edit</button>
      </div>

      {open && (
        <div style={backdrop} onClick={() => setOpen(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={head}>
              <strong>{title ?? 'Edit note'}</strong>
              <button type="button" onClick={() => setOpen(false)}>Done</button>
            </div>
            <MarkupEditor value={value} onChange={onChange} minRows={6} placeholder={placeholder} />
          </div>
        </div>
      )}
    </>
  );
}
