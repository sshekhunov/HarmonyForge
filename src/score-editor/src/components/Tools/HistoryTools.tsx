import { Redo2, Undo2 } from 'lucide-react';
import { historyMarkApplying, historyRedo, historyUndo, useHistorySnapshot } from '../../services/historyService';
import type { MusicXmlDocument } from '../../models/musicXmlDocument';

type Props = {
  musicDoc: MusicXmlDocument | null;
  setMusicDoc: (doc: MusicXmlDocument | null) => void;
};

export function HistoryTools({ musicDoc, setMusicDoc }: Props) {
  const { canUndo, canRedo } = useHistorySnapshot();

  const onUndo = () => {
    if (!musicDoc) return;
    const prev = historyUndo(musicDoc);
    if (!prev) return;
    historyMarkApplying();
    setMusicDoc(prev);
  };

  const onRedo = () => {
    if (!musicDoc) return;
    const next = historyRedo(musicDoc);
    if (!next) return;
    historyMarkApplying();
    setMusicDoc(next);
  };

  return (
    <span className="score-editor__history" role="group" aria-label="History">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={onUndo}
        disabled={!musicDoc || !canUndo}
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
        disabled={!musicDoc || !canRedo}
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

