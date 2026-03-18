import { Redo2, Undo2 } from 'lucide-react';
import { historyMarkApplying, historyRedo, historyUndo, useHistorySnapshot } from '../../services/historyService';
import type { MusicXmlDocument } from '../../models/musicXmlDocument';
import { musicXmlFromString, musicXmlToString } from '../../helpers/musicXmlHelper';

type Props = {
  musicDoc: MusicXmlDocument | null;
  setMusicDoc: (doc: MusicXmlDocument | null) => void;
};

export function HistoryTools({ musicDoc, setMusicDoc }: Props) {
  const { canUndo, canRedo } = useHistorySnapshot();

  const onUndo = () => {
    if (!musicDoc) return;
    const prevXml = historyUndo(musicXmlToString(musicDoc));
    if (!prevXml) return;
    historyMarkApplying();
    setMusicDoc(musicXmlFromString(prevXml));
  };

  const onRedo = () => {
    if (!musicDoc) return;
    const nextXml = historyRedo(musicXmlToString(musicDoc));
    if (!nextXml) return;
    historyMarkApplying();
    setMusicDoc(musicXmlFromString(nextXml));
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

