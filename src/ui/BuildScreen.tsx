import type { CSSProperties } from 'react';
import { useStore } from '../state';

const wrap: CSSProperties = {
  maxWidth: 640, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12,
  color: '#ddd', font: '13px sans-serif',
};
const field: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const textarea: CSSProperties = { width: '100%', minHeight: 120, resize: 'vertical', font: '12px sans-serif' };

export default function BuildScreen() {
  const build = useStore((s) => s.build);
  const setMeta = useStore((s) => s.setMeta);
  return (
    <div style={wrap}>
      <h2 style={{ margin: 0, color: '#e8e6df' }}>Build</h2>
      <label style={field}>
        Name
        <input value={build.name} onChange={(e) => setMeta({ name: e.target.value })} />
      </label>
      <label style={field}>
        Author
        <input value={build.author ?? ''} onChange={(e) => setMeta({ author: e.target.value })} />
      </label>
      <label style={field}>
        Description
        <textarea value={build.description ?? ''} onChange={(e) => setMeta({ description: e.target.value })} style={textarea} />
      </label>
    </div>
  );
}
