import { applyAccidental, clearAccidental } from '../../helpers/accidentalHelpers';
import { useSelectionSnapshot, selectionStoreSetPendingLocator } from '../../helpers/selectionStore';
import type { MusicXmlDocument } from '../../models/musicXmlDocument';
import type { NoteLocator } from '../../models/musicXml';
import type { EditMode } from './EditModeTools';

type Props = {
  musicDoc: MusicXmlDocument | null;
  setMusicDoc: (doc: MusicXmlDocument | null) => void;
  editMode: EditMode;
};

export function AccidentalTools({
  musicDoc,
  setMusicDoc,
  editMode,
}: Props) {
  const { hasSelection, locator, selectedNote } = useSelectionSnapshot() as {
    hasSelection?: boolean;
    locator?: unknown;
    selectedNote?: unknown;
  };
  const isRestSelected = Boolean(locator && (locator as { target?: string }).target === 'rest');
  const disabled =
    editMode === 'erase' ||
    (editMode === 'select' && (!hasSelection || !selectedNote || isRestSelected));
  const disabledBool: boolean = Boolean(disabled);

  const apply = (alter: number, accidentalName: string) => {
    if (!musicDoc) return;
    const loc = locator as NoteLocator | null | undefined;
    if (!loc) return;
    const next = applyAccidental(musicDoc, loc, alter, accidentalName);
    if (!next) return;
    selectionStoreSetPendingLocator(loc);
    setMusicDoc(next);
  };

  const clear = () => {
    if (!musicDoc) return;
    const loc = locator as NoteLocator | null | undefined;
    if (!loc) return;
    const next = clearAccidental(musicDoc, loc);
    if (!next) return;
    selectionStoreSetPendingLocator(loc);
    setMusicDoc(next);
  };

  return (
    <span className="score-editor__accidentals" role="group" aria-label="Change accidental">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(0, 'natural')}
        disabled={disabledBool}
        title="Natural (♮)"
        aria-label="Set note to natural"
      >
        ♮
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(1, 'sharp')}
        disabled={disabledBool}
        title="Sharp (♯)"
        aria-label="Set note to sharp"
      >
        ♯
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(-1, 'flat')}
        disabled={disabledBool}
        title="Flat (♭)"
        aria-label="Set note to flat"
      >
        ♭
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(2, 'double-sharp')}
        disabled={disabledBool}
        title="Double sharp (x)"
        aria-label="Set note to double sharp"
      >
        x
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(-2, 'double-flat')}
        disabled={disabledBool}
        title="Double flat (𝄫)"
        aria-label="Set note to double flat"
      >
        𝄫
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol score-editor__btn--clear"
        onClick={clear}
        disabled={disabledBool}
        title="Remove accidental (note follows key signature)"
        aria-label="Remove accidental so note follows key signature"
      >
        <span className="score-editor__clear-icon" aria-hidden>
          ⊘
        </span>
      </button>
    </span>
  );
}

