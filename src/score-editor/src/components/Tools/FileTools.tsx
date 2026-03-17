import { useRef } from 'react';

type Props = {
  musicXmlFile: string | null;
  setMusicXmlFile: (xml: string) => void;
};

export function FileTools({ musicXmlFile, setMusicXmlFile }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') setMusicXmlFile(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!musicXmlFile) return;
    const blob = new Blob([musicXmlFile], {
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </span>
      </button>
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={handleSave}
        disabled={!musicXmlFile}
        title="Save File"
        aria-label="Save File"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </span>
      </button>
    </>
  );
}

