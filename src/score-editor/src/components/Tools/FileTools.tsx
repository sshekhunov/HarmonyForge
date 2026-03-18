import { FolderOpen, Save } from 'lucide-react';
import { useRef } from 'react';
import type { MusicXmlDocument } from '../../models/musicXmlDocument';
import { musicXmlFromString, musicXmlToString } from '../../helpers/musicXmlHelper';
import { historyReset } from '../../services/historyService';

type Props = {
  musicDoc: MusicXmlDocument | null;
  setMusicDoc: (doc: MusicXmlDocument | null) => void;
};

export function FileTools({ musicDoc, setMusicDoc }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        historyReset();
        setMusicDoc(musicXmlFromString(text));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!musicDoc) return;
    const xml = musicXmlToString(musicDoc);
    const blob = new Blob([xml], {
      type: 'application/vnd.recordare.musicxml+xml',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'score.musicxml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.musicxml,.mxl"
        onChange={handleFileChange}
        className="score-editor__file-input"
        aria-hidden
      />
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={() => fileInputRef.current?.click()}
        title="Open File"
        aria-label="Open File"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <FolderOpen size={18} strokeWidth={1.75} />
        </span>
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={handleSave}
        disabled={!musicDoc}
        title="Save File"
        aria-label="Save File"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <Save size={18} strokeWidth={1.75} />
        </span>
      </button>
    </>
  );
}

