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
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
      <span style={{ opacity: 0.7 }}>lvl</span>
      <input
        type="number"
        min={1}
        max={100}
        value={from ?? ''}
        placeholder="1"
        onChange={(e) => set(num(e.target.value), to)}
        style={{ width: 44 }}
      />
      <span>–</span>
      <input
        type="number"
        min={1}
        max={100}
        value={to ?? ''}
        placeholder="100"
        onChange={(e) => set(from, num(e.target.value))}
        style={{ width: 44 }}
      />
    </span>
  );
}
