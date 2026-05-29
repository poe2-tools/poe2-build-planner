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
  flexShrink: 0, padding: '4px 14px', textAlign: 'center',
  background: 'rgba(16,12,7,0.92)', borderTop: '1px solid var(--bronze)',
  color: 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.02em',
};
const splash: CSSProperties = {
  position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column', gap: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.22em',
  textTransform: 'uppercase', fontSize: 15,
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

  if (error)
    return (
      <div style={{ ...splash, color: 'var(--blood-lit)' }}>
        <div>Failed to load data</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: 0, textTransform: 'none', color: 'var(--text-muted)', maxWidth: 480, textAlign: 'center' }}>{error}</div>
      </div>
    );
  if (!tree || !atlases) return <div style={{ ...splash, color: 'var(--gold)' }}>Loading…</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', display: 'flex', flexDirection: 'column' }}>
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
