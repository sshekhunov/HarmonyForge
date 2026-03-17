type Props = {
  hasSelection: boolean;
  onNatural: () => void;
  onSharp: () => void;
  onFlat: () => void;
  onDoubleSharp: () => void;
  onDoubleFlat: () => void;
  onClear: () => void;
};

export function AccidentalTools({
  hasSelection,
  onNatural,
  onSharp,
  onFlat,
  onDoubleSharp,
  onDoubleFlat,
  onClear,
}: Props) {
  return (
    <span className="score-editor__accidentals" role="group" aria-label="Change accidental">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={onNatural}
        disabled={!hasSelection}
        title="Natural (♮)"
        aria-label="Set note to natural"
      >
        ♮
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={onSharp}
        disabled={!hasSelection}
        title="Sharp (♯)"
        aria-label="Set note to sharp"
      >
        ♯
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={onFlat}
        disabled={!hasSelection}
        title="Flat (♭)"
        aria-label="Set note to flat"
      >
        ♭
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={onDoubleSharp}
        disabled={!hasSelection}
        title="Double sharp (𝄪)"
        aria-label="Set note to double sharp"
      >
        𝄪
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol"
        onClick={onDoubleFlat}
        disabled={!hasSelection}
        title="Double flat (𝄫)"
        aria-label="Set note to double flat"
      >
        𝄫
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--symbol score-editor__btn--clear"
        onClick={onClear}
        disabled={!hasSelection}
        title="Remove accidental (note follows key signature)"
        aria-label="Remove accidental so note follows key signature"
      >
        <span className="score-editor__clear-icon" aria-hidden>
          ⌫
        </span>
      </button>
    </span>
  );
}

