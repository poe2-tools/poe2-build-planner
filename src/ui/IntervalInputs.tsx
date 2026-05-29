import type { LevelInterval } from '../buildfile';

interface Props {
  value: LevelInterval | undefined;
  onChange: (interval: LevelInterval | undefined) => void;
}

export default function IntervalInputs({ value, onChange }: Props) {
  const from = value?.[0];
  const to = value?.[1];
  const num = (v: string): number | undefined => (v === '' ? undefined : Number(v));
  const set = (f: number | undefined, t: number | undefined) => {
    if (f === undefined && t === undefined) onChange(undefined);
    else onChange([f ?? 1, t ?? 100]);
  };
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>lvl</span>
      <input
        type="number"
        min={1}
        max={100}
        value={from ?? ''}
        placeholder="1"
        onChange={(e) => set(num(e.target.value), to)}
        style={{ width: 52, padding: '4px 5px' }}
      />
      <span>–</span>
      <input
        type="number"
        min={1}
        max={100}
        value={to ?? ''}
        placeholder="100"
        onChange={(e) => set(from, num(e.target.value))}
        style={{ width: 52, padding: '4px 5px' }}
      />
    </span>
  );
}
