import { applyAccidental, clearAccidental } from '../../helpers/accidentalHelpers';
import { useSelectionSnapshot, selectionStoreSetPendingLocator } from '../../helpers/selectionStore';
import type { MusicXmlDocument } from '../../models/musicXmlDocument';

type Props = {
  musicDoc: MusicXmlDocument | null;
  setMusicDoc: (doc: MusicXmlDocument | null) => void;
};

export function AccidentalTools({
  musicDoc,
  setMusicDoc,
}: Props) {
  const { hasSelection, locator } = useSelectionSnapshot();
  const isRestSelected = locator?.target === 'rest';
  const disabled = !hasSelection || isRestSelected;

  const apply = (alter: number, accidentalName: string) => {
    if (!musicDoc) return;
    if (!locator) return;
    const next = applyAccidental(musicDoc, locator, alter, accidentalName);
    if (!next) return;
    selectionStoreSetPendingLocator(locator);
    setMusicDoc(next);
  };

  const clear = () => {
    if (!musicDoc) return;
    if (!locator) return;
    const next = clearAccidental(musicDoc, locator);
    if (!next) return;
    selectionStoreSetPendingLocator(locator);
    setMusicDoc(next);
  };

  return (
    <span className="score-editor__accidentals" role="group" aria-label="Change accidental">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(0, 'natural')}
        disabled={disabled}
        title="Natural (♮)"
        aria-label="Set note to natural"
      >
        ♮
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(1, 'sharp')}
        disabled={disabled}
        title="Sharp (♯)"
        aria-label="Set note to sharp"
      >
        ♯
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(-1, 'flat')}
        disabled={disabled}
        title="Flat (♭)"
        aria-label="Set note to flat"
      >
        ♭
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(2, 'double-sharp')}
        disabled={disabled}
        title="Double sharp (x)"
        aria-label="Set note to double sharp"
      >
        x
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(-2, 'double-flat')}
        disabled={disabled}
        title="Double flat (𝄫)"
        aria-label="Set note to double flat"
      >
        𝄫
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol score-editor__btn--clear"
        onClick={clear}
        disabled={disabled}
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

