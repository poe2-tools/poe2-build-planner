import type { CSSProperties, ChangeEvent } from 'react';
import { useStore } from '../state';
import { parseBuild } from '../buildfile';

const panel: CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-body)', fontSize: 13,
  color: 'var(--text)',
};

export default function LoadSave() {
  const loadBuild = useStore((s) => s.loadBuild);
  const serialize = useStore((s) => s.serialize);
  const name = useStore((s) => s.build.name);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadBuild(parseBuild(await file.text()));
    e.target.value = '';
  };

  const onSave = () => {
    const blob = new Blob([serialize()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'build'}.build`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={panel}>
      <label className="btn-label">
        Load
        <input type="file" accept=".build,application/json" onChange={onFile} style={{ display: 'none' }} />
      </label>
      <button className="btn-primary" onClick={onSave}>Save</button>
    </div>
  );
}
