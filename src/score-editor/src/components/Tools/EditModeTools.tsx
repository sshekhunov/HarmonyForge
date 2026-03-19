import { Eraser, MousePointer } from 'lucide-react';

export type EditMode = 'select' | 'erase';

type Props = {
  mode: EditMode;
  setMode: (mode: EditMode) => void;
};

export function EditModeTools({ mode, setMode }: Props) {
  return (
    <span className="score-editor__editmode" role="group" aria-label="Edit mode">
      <button
        type="button"
        className={`score-editor__btn score-editor__btn--icon-only score-editor__btn--toggle${mode === 'select' ? ' is-active' : ''}`}
        onClick={() => setMode('select')}
        aria-pressed={mode === 'select'}
        title="Select"
        aria-label="Select"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <MousePointer size={18} strokeWidth={1.75} />
        </span>
      </button>
      <button
        type="button"
        className={`score-editor__btn score-editor__btn--icon-only score-editor__btn--toggle${mode === 'erase' ? ' is-active' : ''}`}
        onClick={() => setMode('erase')}
        aria-pressed={mode === 'erase'}
        title="Erase"
        aria-label="Erase"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <Eraser size={18} strokeWidth={1.75} />
        </span>
      </button>
    </span>
  );
}

