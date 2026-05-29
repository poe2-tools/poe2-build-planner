import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { wrapSelection, FONT_TAGS, COLOURS } from './markup';
import MarkupPreview from './MarkupPreview';

interface Props {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  placeholder?: string;
}

const wrap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, font: '12px sans-serif' };
const toolbar: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 };
const btn: CSSProperties = {
  font: '11px sans-serif', minWidth: 22, padding: '2px 5px', cursor: 'pointer',
  background: '#f4f5f8', color: '#1b1d24', border: '1px solid #c4c7d2', borderRadius: 4,
};
const swatch: CSSProperties = {
  width: 16, height: 16, padding: 0, cursor: 'pointer', border: '1px solid #c4c7d2', borderRadius: 3,
};
const colourInput: CSSProperties = { width: 22, height: 18, padding: 0, border: '1px solid #c4c7d2', cursor: 'pointer' };
const textarea: CSSProperties = { width: '100%', resize: 'vertical', font: '12px sans-serif', boxSizing: 'border-box' };
const caption: CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7f8598' };
const preview: CSSProperties = {
  whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fbfbfd', color: '#1b1d24',
  border: '1px solid #e0e2ea', borderRadius: 4, padding: 6, minHeight: 18,
};

// '#rrggbb' -> '<rgb(r, g, b)>' tag name (custom colour picker output).
function hexToRgbTag(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function MarkupEditor({ value, onChange, minRows, placeholder }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Last known selection (kept fresh via textarea events so a toolbar click,
  // which would otherwise move focus, still wraps the right range).
  const sel = useRef({ start: 0, end: 0 });
  // After an edit we want to restore + reselect the inserted inner content.
  const pending = useRef<{ start: number; end: number } | null>(null);

  const captureSel = () => {
    const ta = taRef.current;
    if (ta) sel.current = { start: ta.selectionStart, end: ta.selectionEnd };
  };

  useEffect(() => {
    const ta = taRef.current;
    if (ta && pending.current) {
      ta.focus();
      ta.setSelectionRange(pending.current.start, pending.current.end);
      pending.current = null;
    }
  });

  const applyTag = (tag: string) => {
    // Read fresh selection if the textarea still has it; else use the tracked one.
    const ta = taRef.current;
    let start = sel.current.start;
    let end = sel.current.end;
    if (ta && document.activeElement === ta) {
      start = ta.selectionStart;
      end = ta.selectionEnd;
    }
    const next = wrapSelection(value, start, end, tag);
    pending.current = { start: next.selStart, end: next.selEnd };
    onChange(next.text);
  };

  return (
    <div style={wrap}>
      <div style={toolbar}>
        {FONT_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            style={btn}
            title={`<${t}>`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTag(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <span style={{ width: 1, alignSelf: 'stretch', background: '#d6d8e0', margin: '0 2px' }} />
        {Object.entries(COLOURS).map(([name, hex]) => (
          <button
            key={name}
            type="button"
            title={name}
            style={{ ...swatch, background: hex }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyTag(name)}
          />
        ))}
        <input
          type="color"
          title="Custom colour"
          style={colourInput}
          onMouseDown={captureSel}
          onChange={(e) => applyTag(hexToRgbTag(e.target.value))}
        />
      </div>

      <textarea
        ref={taRef}
        value={value}
        placeholder={placeholder}
        rows={minRows ?? 3}
        style={textarea}
        onChange={(e) => onChange(e.target.value)}
        onSelect={captureSel}
        onKeyUp={captureSel}
        onClick={captureSel}
        onBlur={captureSel}
      />

      {value && (
        <>
          <div style={caption}>Preview</div>
          <div style={preview}><MarkupPreview text={value} /></div>
        </>
      )}
    </div>
  );
}
