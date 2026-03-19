import { useEffect, useMemo, useState } from 'react';
import { useSelectionSnapshot } from '../../helpers/selectionStore';
import { selectionStoreSetPendingLocator } from '../../helpers/selectionStore';
import { applyDurationWithReflow, getDotCountFromDoc, getDurationIdFromDoc } from '../../helpers/durationHelpers.ts';
import type { MusicXmlDocument } from '../../models/musicXmlDocument';
import type { EditMode } from './EditModeTools';

type DurationValue = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th';

type DurationDef = {
  id: DurationValue;
  label: string;
  symbol: string;
};

type DotValue = 0 | 1 | 2;

const DURATIONS: DurationDef[] = [
  { id: 'whole', label: 'Whole', symbol: '𝅝' },
  { id: 'half', label: 'Half', symbol: '𝅗𝅥' },
  { id: 'quarter', label: 'Quarter', symbol: '𝅘𝅥' },
  { id: 'eighth', label: 'Eighth', symbol: '𝅘𝅥𝅮' },
  { id: '16th', label: 'Sixteenth', symbol: '𝅘𝅥𝅯' },
  { id: '32nd', label: 'Thirty-second', symbol: '𝅘𝅥𝅰' },
  { id: '64th', label: 'Sixty-fourth', symbol: '𝅘𝅥𝅱' },
];

const DOTS: Array<{ id: DotValue; label: string; symbol: string }> = [
  { id: 0, label: 'Single note', symbol: '𝅘𝅥' },
  { id: 1, label: 'Dotted (×1.5)', symbol: '𝅘𝅥·' },
  { id: 2, label: 'Double-dotted (×1.75)', symbol: '𝅘𝅥··' },
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
  musicDoc: MusicXmlDocument | null;
  setMusicDoc: (doc: MusicXmlDocument | null) => void;
  editMode: EditMode;
  onSelectionChange?: (duration: DurationValue, dots: DotValue) => void;
};

export function DurationTools({ musicDoc, setMusicDoc, editMode, onSelectionChange }: Props) {
  const { hasSelection, locator, selectedNote } = useSelectionSnapshot() as {
    hasSelection?: boolean;
    locator?: unknown;
    selectedNote?: unknown;
  };
  const [manualSelected, setManualSelected] = useState<DurationValue>('quarter');
  const [manualDot, setManualDot] = useState<DotValue>(0);
  const byId = useMemo(() => new Map(DURATIONS.map((d) => [d.id, d])), []);
  const selectedFromXml =
    musicDoc && locator ? (getDurationIdFromDoc(musicDoc, locator as any) as DurationValue | null) : null;
  const dotFromXml =
    musicDoc && locator ? (getDotCountFromDoc(musicDoc, locator as any) as DotValue | null) : null;
  const selectedFromNote = durationIdFromSelectedNote(selectedNote);
  const selected = selectedFromXml ?? selectedFromNote ?? manualSelected;
  const dot = dotFromXml ?? manualDot;
  const durationToolsDisabled =
    editMode === 'erase' || (editMode === 'select' && (!hasSelection || !selectedNote));
  useEffect(() => {
    onSelectionChange?.(selected, dot);
  }, [dot, onSelectionChange, selected]);

  return (
    <span className="score-editor__durations" aria-label="Duration tools">
      <span className="score-editor__durations-group" role="group" aria-label="Note duration">
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
                if (!musicDoc) return;
                if (!locator) return;
                const next = applyDurationWithReflow(musicDoc, locator as any, def.id, dot);
                if (!next) return;
                selectionStoreSetPendingLocator(locator as any);
                setMusicDoc(next);
              }}
              aria-pressed={isSelected}
              disabled={durationToolsDisabled}
              title={def.label}
              aria-label={`Set duration to ${def.label.toLowerCase()}`}
            >
              {def.symbol}
            </button>
          );
        })}
      </span>

      <span className="score-editor__durations-group" role="group" aria-label="Dotting">
        {DOTS.map((d) => {
          const isSelected = dot === d.id;
          return (
            <button
              key={d.id}
              type="button"
              className={`score-editor__btn score-editor__btn--symbol score-editor__btn--toggle${isSelected ? ' is-active' : ''}`}
              onClick={() => {
                setManualDot(d.id);
                if (!musicDoc) return;
                if (!locator) return;
                const next = applyDurationWithReflow(musicDoc, locator as any, selected, d.id);
                if (!next) return;
                selectionStoreSetPendingLocator(locator as any);
                setMusicDoc(next);
              }}
              aria-pressed={isSelected}
              disabled={durationToolsDisabled}
              title={d.label}
              aria-label={d.label}
            >
              {d.symbol}
            </button>
          );
        })}
      </span>
    </span>
  );
}

