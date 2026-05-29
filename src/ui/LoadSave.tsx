import type { CSSProperties, ChangeEvent } from 'react';
import { useStore } from '../state';
import { parseBuild } from '../buildfile';

const panel: CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', font: '13px sans-serif', color: '#ddd',
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
      <label style={{ cursor: 'pointer' }}>
        Load .build
        <input type="file" accept=".build,application/json" onChange={onFile} style={{ display: 'none' }} />
      </label>
      <button onClick={onSave}>Save .build</button>
    </div>
  );
}
