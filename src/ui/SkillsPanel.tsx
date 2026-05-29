import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../state';
import { gemById } from '../gems';
import { GemIcon } from '../icons';
import GemPicker from './GemPicker';
import RangeBar from './RangeBar';
import IntervalInputs from './IntervalInputs';
import MarkupField from './MarkupField';

const card: CSSProperties = { padding: 11, display: 'flex', flexDirection: 'column', gap: 8 };
const wrap: CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: 24 };
const title: CSSProperties = {
  margin: '0 0 14px', fontSize: 22, letterSpacing: '0.12em', textTransform: 'uppercase',
};
const grid: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginTop: 8,
};
const gemRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const skillName: CSSProperties = {
  flex: 1, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
  color: 'var(--gold-bright)', letterSpacing: '0.02em',
};
const supportBlock: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 10, marginLeft: 3,
  borderLeft: '1px solid var(--line)',
};

type Picker = { kind: 'skill' } | { kind: 'support'; setupIndex: number } | null;

export default function SkillsPanel() {
  const skillRanges = useStore((s) => s.skillRanges);
  const activeSkillId = useStore((s) => s.activeSkillId);
  const gems = useStore((s) => s.gems);
  const addSkillSetup = useStore((s) => s.addSkillSetup);
  const removeSkillSetup = useStore((s) => s.removeSkillSetup);
  const moveSkillSetup = useStore((s) => s.moveSkillSetup);
  const addSupport = useStore((s) => s.addSupport);
  const removeSupport = useStore((s) => s.removeSupport);
  const setSupportInterval = useStore((s) => s.setSupportInterval);
  const setSkillText = useStore((s) => s.setSkillText);
  const [picker, setPicker] = useState<Picker>(null);

  const skills = skillRanges.find((r) => r.id === activeSkillId)?.skills ?? [];
  const nameOf = (id: string) => (gems ? gemById(gems, id)?.displayName ?? id : id);
  const iconOf = (id: string) => (gems ? gemById(gems, id)?.iconDdsFile : undefined);

  return (
    <div style={wrap}>
      <h2 style={title}>Skill Gems</h2>
      <RangeBar domain="skills" />
      <div style={grid}>
        {skills.map((setup, i) => {
          const mainIcon = iconOf(setup.id);
          return (
            <div key={i} className="card" style={card}>
              <div style={gemRow}>
                {mainIcon && <GemIcon iconDdsFile={mainIcon} size={28} />}
                <strong style={skillName}>{nameOf(setup.id)}</strong>
                <button onClick={() => moveSkillSetup(i, -1)} disabled={i === 0} title="Move up">↑</button>
                <button onClick={() => moveSkillSetup(i, 1)} disabled={i === skills.length - 1} title="Move down">↓</button>
                <button onClick={() => removeSkillSetup(i)}>Remove</button>
              </div>
              <MarkupField
                value={setup.additional_text ?? ''}
                onChange={(v) => setSkillText(i, v)}
                placeholder="Notes…"
                title={`${nameOf(setup.id)} — notes`}
              />
              {(setup.support_skills ?? []).map((sup, j) => {
                const supIcon = iconOf(sup.id);
                return (
                  <div key={j} style={supportBlock}>
                    <div style={gemRow}>
                      {supIcon && <GemIcon iconDdsFile={supIcon} size={22} />}
                      <span style={{ flex: 1, color: 'var(--text)' }}>{nameOf(sup.id)}</span>
                      <IntervalInputs value={sup.level_interval} onChange={(iv) => setSupportInterval(i, j, iv)} />
                      <button onClick={() => removeSupport(i, j)}>✕</button>
                    </div>
                    <MarkupField
                      value={sup.additional_text ?? ''}
                      onChange={(v) => setSkillText(i, v, j)}
                      placeholder="Support note…"
                      title={`${nameOf(sup.id)} — note`}
                    />
                  </div>
                );
              })}
              <button onClick={() => setPicker({ kind: 'support', setupIndex: i })} style={{ alignSelf: 'flex-start' }}>
                + Support
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={() => setPicker({ kind: 'skill' })} style={{ marginTop: 12 }}>+ Add skill</button>

      {picker && (
        <GemPicker
          role={picker.kind === 'support' ? 'support' : 'skill'}
          onPick={(id) => {
            if (picker.kind === 'support') addSupport(picker.setupIndex, id);
            else addSkillSetup(id);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
