import { useMemo, useState } from 'react';
import { useSelectionSnapshot } from '../../helpers/selectionStore';
import { selectionStoreSetPendingLocator } from '../../helpers/selectionStore';
import { applyDurationWithReflow, getDurationIdFromXml } from '../../helpers/durationHelpers';

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

function durationIdFromSelectedNote(selectedNote: unknown): DurationValue | null {
  const sn = selectedNote as {
    sourceNote?: unknown;
  };
  const source = sn?.sourceNote as any;
  if (!source) return null;

  const typeRaw = source.NoteTypeXml ?? source.noteTypeXml;
  if (typeof typeRaw === 'string') {
    const t = typeRaw.toLowerCase();
    if (t.includes('whole')) return 'whole';
    if (t.includes('half')) return 'half';
    if (t.includes('quarter')) return 'quarter';
    if (t.includes('eighth')) return 'eighth';
    if (t.includes('sixteenth') || t.includes('16')) return '16th';
    if (t.includes('thirty') || t.includes('32')) return '32nd';
    if (t.includes('sixty') || t.includes('64')) return '64th';
  }

  const frac = source.Length ?? source.TypeLength ?? null;
  const rv = frac?.RealValue ?? frac?.realValue ?? null;
  const v = typeof rv === 'number' && Number.isFinite(rv) ? rv : null;
  if (v !== null) {
    const eps = 1e-6;
    if (Math.abs(v - 1) < eps) return 'whole';
    if (Math.abs(v - 0.5) < eps) return 'half';
    if (Math.abs(v - 0.25) < eps) return 'quarter';
    if (Math.abs(v - 0.125) < eps) return 'eighth';
    if (Math.abs(v - 0.0625) < eps) return '16th';
    if (Math.abs(v - 0.03125) < eps) return '32nd';
    if (Math.abs(v - 0.015625) < eps) return '64th';
  }

  return null;
}

type Props = {
  musicXmlFile: string | null;
  setMusicXmlFile: (xml: string) => void;
};

export function DurationTools({ musicXmlFile, setMusicXmlFile }: Props) {
  const { hasSelection, locator, selectedNote } = useSelectionSnapshot() as {
    hasSelection?: boolean;
    locator?: unknown;
    selectedNote?: unknown;
  };
  const [manualSelected, setManualSelected] = useState<DurationValue>('quarter');
  const byId = useMemo(() => new Map(DURATIONS.map((d) => [d.id, d])), []);
  const selectedFromXml =
    musicXmlFile && locator ? (getDurationIdFromXml(musicXmlFile, locator as any) as DurationValue | null) : null;
  const selectedFromNote = durationIdFromSelectedNote(selectedNote);
  const selected = selectedFromXml ?? selectedFromNote ?? manualSelected;

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
            onClick={() => {
              setManualSelected(def.id);
              if (!musicXmlFile) return;
              if (!locator) return;
              const newXml = applyDurationWithReflow(musicXmlFile, locator as any, def.id);
              if (!newXml) return;
              selectionStoreSetPendingLocator(locator as any);
              setMusicXmlFile(newXml);
            }}
            aria-pressed={isSelected}
            disabled={!hasSelection}
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

