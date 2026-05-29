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
  flex: 1, minHeight: 34, maxHeight: 120, overflow: 'auto', padding: '5px 7px', cursor: 'text',
  background: 'var(--field)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: 3,
  fontFamily: 'var(--font-body)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};
const editBtn: CSSProperties = { alignSelf: 'flex-start', fontSize: 11, padding: '4px 9px' };
const placeholderStyle: CSSProperties = { color: 'var(--text-dim)', fontStyle: 'italic' };

const backdrop: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modal: CSSProperties = {
  width: 'min(520px, 92vw)', maxHeight: '85vh', overflow: 'auto',
  background: 'linear-gradient(180deg, #241c10, #120d07)', color: 'var(--text)',
  border: '1px solid var(--bronze)', borderTopColor: 'var(--bronze-lit)', borderRadius: 5,
  padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
  boxShadow: 'var(--shadow)',
};
const head: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const headTitle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.04em',
};

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
        // Close only when the press itself starts on the backdrop — a drag-select that
        // begins inside the modal and releases out here must NOT close it.
        <div style={backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={modal}>
            <div style={head}>
              <strong style={headTitle}>{title ?? 'Edit note'}</strong>
              <button type="button" onClick={() => setOpen(false)}>Done</button>
            </div>
            <MarkupEditor value={value} onChange={onChange} minRows={6} placeholder={placeholder} />
          </div>
        </div>
      )}
    </>
  );
}
