import { historyMarkApplying, historyRedo, historyUndo, useHistorySnapshot } from '../../services/historyService';

type Props = {
  musicXmlFile: string | null;
  setMusicXmlFile: (xml: string) => void;
};

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M7 7V3L0 10l7 7v-4h8.5c3.59 0 6.5 2.91 6.5 6.5V22h2v-2.5C24 14.81 20.19 11 15.5 11H7V7z"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M17 7V3l7 7-7 7v-4H8.5C4.91 13 2 15.91 2 19.5V22H0v-2.5C0 14.81 3.81 11 8.5 11H17V7z"
      />
    </svg>
  );
}

export function HistoryTools({ musicXmlFile, setMusicXmlFile }: Props) {
  const { canUndo, canRedo } = useHistorySnapshot();

  const onUndo = () => {
    if (!musicXmlFile) return;
    const prev = historyUndo(musicXmlFile);
    if (!prev) return;
    historyMarkApplying();
    setMusicXmlFile(prev);
  };

  const onRedo = () => {
    if (!musicXmlFile) return;
    const next = historyRedo(musicXmlFile);
    if (!next) return;
    historyMarkApplying();
    setMusicXmlFile(next);
  };

  return (
    <span role="group" aria-label="History">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={onUndo}
        disabled={!musicXmlFile || !canUndo}
        title="Undo"
        aria-label="Undo"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <UndoIcon />
        </span>
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={onRedo}
        disabled={!musicXmlFile || !canRedo}
        title="Redo"
        aria-label="Redo"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <RedoIcon />
        </span>
      </button>
    </span>
  );
}

