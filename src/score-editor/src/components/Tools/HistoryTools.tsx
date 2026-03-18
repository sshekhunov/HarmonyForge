import { Redo2, Undo2 } from 'lucide-react';
import { historyMarkApplying, historyRedo, historyUndo, useHistorySnapshot } from '../../services/historyService';

type Props = {
  musicXmlFile: string | null;
  setMusicXmlFile: (xml: string) => void;
};

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
    <span className="score-editor__history" role="group" aria-label="History">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={onUndo}
        disabled={!musicXmlFile || !canUndo}
        title="Undo"
        aria-label="Undo"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <Undo2 size={18} strokeWidth={1.75} />
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
          <Redo2 size={18} strokeWidth={1.75} />
        </span>
      </button>
    </span>
  );
}

