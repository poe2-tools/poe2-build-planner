import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { loadTreeData, loadAtlas } from './tree/source';
import type { Atlas } from './tree/source';
import { loadGems } from './gems';
import { useStore } from './state';
import AppHeader from './ui/AppHeader';
import type { Screen } from './ui/AppHeader';
import TreeScreen from './ui/TreeScreen';
import SkillsPanel from './ui/SkillsPanel';
import ItemsPanel from './ui/ItemsPanel';
import BuildScreen from './ui/BuildScreen';

const screenWrap: CSSProperties = { position: 'absolute', inset: 0, overflowY: 'auto' };
// GGG's developer policy requires apps to display the non-affiliation notice.
const footer: CSSProperties = {
  flexShrink: 0, padding: '3px 12px', textAlign: 'center',
  background: 'rgba(20,22,30,0.96)', borderTop: '1px solid #2a2d3a',
  color: '#6b7080', font: '11px sans-serif',
};

export default function App() {
  const tree = useStore((s) => s.tree);
  const setTree = useStore((s) => s.setTree);
  const setGems = useStore((s) => s.setGems);
  const [atlases, setAtlases] = useState<{ skills: Atlas; frames: Atlas } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('tree');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, skills, frames, gems] = await Promise.all([
          loadTreeData(),
          loadAtlas('skills'),
          loadAtlas('frame'),
          loadGems(),
        ]);
        if (cancelled) return;
        setTree(t);
        setGems(gems);
        setAtlases({ skills, frames });
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTree, setGems]);

  if (error) return <div style={{ color: '#f88', padding: 16 }}>Failed to load data: {error}</div>;
  if (!tree || !atlases) return <div style={{ color: '#ccc', padding: 16 }}>Loading…</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0c0d12', display: 'flex', flexDirection: 'column' }}>
      <AppHeader active={screen} onSelect={setScreen} />
      <main style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {/* Tree stays mounted (display toggle) so pan/zoom survives tab switches. */}
        <div style={{ position: 'absolute', inset: 0, display: screen === 'tree' ? 'block' : 'none' }}>
          <TreeScreen skills={atlases.skills} frames={atlases.frames} />
        </div>
        {screen === 'skills' && <div style={screenWrap}><SkillsPanel /></div>}
        {screen === 'items' && <div style={screenWrap}><ItemsPanel /></div>}
        {screen === 'build' && <div style={screenWrap}><BuildScreen /></div>}
      </main>
      <footer style={footer}>
        This product isn't affiliated with or endorsed by Grinding Gear Games in any way. Path of
        Exile is a trademark of Grinding Gear Games; all game content © Grinding Gear Games.
      </footer>
    </div>
  );
}
