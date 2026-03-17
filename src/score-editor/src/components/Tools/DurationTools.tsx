import { useMemo, useState } from 'react';

type DurationValue = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th';

type DurationDef = {
  id: DurationValue;
  label: string;
  symbol: string;
};

const DURATIONS: DurationDef[] = [
  { id: 'whole', label: 'Whole', symbol: '𝅝' },
  { id: 'half', label: 'Half', symbol: '𝅗𝅥' },
  { id: 'quarter', label: 'Quarter', symbol: '𝅘𝅥' },
  { id: 'eighth', label: 'Eighth', symbol: '𝅘𝅥𝅮' },
  { id: '16th', label: 'Sixteenth', symbol: '𝅘𝅥𝅯' },
  { id: '32nd', label: 'Thirty-second', symbol: '𝅘𝅥𝅰' },
  { id: '64th', label: 'Sixty-fourth', symbol: '𝅘𝅥𝅱' },
];

export function DurationTools() {
  const [selected, setSelected] = useState<DurationValue>('quarter');
  const byId = useMemo(() => new Map(DURATIONS.map((d) => [d.id, d])), []);

  return (
    <span className="score-editor__durations" role="group" aria-label="Note duration">
      {DURATIONS.map((d) => {
        const def = byId.get(d.id) ?? d;
        const isSelected = selected === def.id;
        return (
          <button
            key={def.id}
            type="button"
            className={`score-editor__btn score-editor__btn--symbol score-editor__btn--toggle${isSelected ? ' is-active' : ''}`}
            onClick={() => setSelected(def.id)}
            aria-pressed={isSelected}
            title={def.label}
            aria-label={`Set duration to ${def.label.toLowerCase()}`}
          >
            {def.symbol}
          </button>
        );
      })}
    </span>
  );
}

