import { applyAccidentalToXmlByLocator } from '../../helpers/accidentalHelpers';
import { useSelectionSnapshot, selectionStoreSetPendingLocator } from '../../helpers/selectionStore';

type Props = {
  musicXmlFile: string | null;
  setMusicXmlFile: (xml: string) => void;
};

export function AccidentalTools({
  musicXmlFile,
  setMusicXmlFile,
}: Props) {
  const { hasSelection, locator } = useSelectionSnapshot();

  const apply = (alter: number, accidentalName: string) => {
    if (!musicXmlFile) return;
    if (!locator) return;
    const newXml = applyAccidentalToXmlByLocator(musicXmlFile, locator, alter, accidentalName);
    if (!newXml) return;
    selectionStoreSetPendingLocator(locator);
    setMusicXmlFile(newXml);
  };

  return (
    <span className="score-editor__accidentals" role="group" aria-label="Change accidental">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(0, 'natural')}
        disabled={!hasSelection}
        title="Natural (♮)"
        aria-label="Set note to natural"
      >
        ♮
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(1, 'sharp')}
        disabled={!hasSelection}
        title="Sharp (♯)"
        aria-label="Set note to sharp"
      >
        ♯
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(-1, 'flat')}
        disabled={!hasSelection}
        title="Flat (♭)"
        aria-label="Set note to flat"
      >
        ♭
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(2, 'double-sharp')}
        disabled={!hasSelection}
        title="Double sharp (x)"
        aria-label="Set note to double sharp"
      >
        x
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={() => apply(-2, 'double-flat')}
        disabled={!hasSelection}
        title="Double flat (𝄫)"
        aria-label="Set note to double flat"
      >
        𝄫
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol score-editor__btn--clear"
        onClick={() => apply(0, '')}
        disabled={!hasSelection}
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

