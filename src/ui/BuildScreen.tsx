import type { CSSProperties } from 'react';
import { useStore } from '../state';

const wrap: CSSProperties = {
  maxWidth: 620, margin: '0 auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 16,
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
};
const title: CSSProperties = {
  margin: 0, fontSize: 22, letterSpacing: '0.12em', textTransform: 'uppercase',
};
const formCard: CSSProperties = { padding: 18, display: 'flex', flexDirection: 'column', gap: 14 };
const field: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 };
const caption: CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'var(--text-muted)',
};
const textarea: CSSProperties = { width: '100%', minHeight: 120, resize: 'vertical' };

export default function BuildScreen() {
  const build = useStore((s) => s.build);
  const setMeta = useStore((s) => s.setMeta);
  return (
    <div style={wrap}>
      <h2 style={title}>Build</h2>
      <hr className="gilt-rule" />
      <div className="card" style={formCard}>
        <label style={field}>
          <span style={caption}>Name</span>
          <input value={build.name} onChange={(e) => setMeta({ name: e.target.value })} />
        </label>
        <label style={field}>
          <span style={caption}>Author</span>
          <input value={build.author ?? ''} onChange={(e) => setMeta({ author: e.target.value })} />
        </label>
        <label style={field}>
          <span style={caption}>Description</span>
          <textarea value={build.description ?? ''} onChange={(e) => setMeta({ description: e.target.value })} style={textarea} />
        </label>
      </div>
    </div>
  );
}
