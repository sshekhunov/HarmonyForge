import { useCallback, useEffect, useRef, useState } from 'react';
import './ScoreEditor.css';

// OSMD: use interface because the package's UMD bundle export doesn't match its .d.ts
interface IOSMDInstance {
  load(content: string | Document | Blob, tempTitle?: string): Promise<unknown>;
  render(): void;
}

async function createOsmd(container: HTMLElement): Promise<IOSMDInstance> {
  // Bundle exposes OpenSheetMusicDisplay on default or as namespace
  const OSMD = await import('opensheetmusicdisplay');
  const Ctor = (OSMD as { OpenSheetMusicDisplay?: new (c: HTMLElement, o?: object) => IOSMDInstance }).OpenSheetMusicDisplay
    ?? (OSMD as { default?: { OpenSheetMusicDisplay?: new (c: HTMLElement, o?: object) => IOSMDInstance } }).default?.OpenSheetMusicDisplay
    ?? (OSMD as unknown as new (c: HTMLElement, o?: object) => IOSMDInstance);
  return new (Ctor as new (c: HTMLElement, o?: object) => IOSMDInstance)(container, { autoResize: true, drawTitle: true });
}

export function ScoreEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<IOSMDInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentXml, setCurrentXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initOsmd = useCallback(async () => {
    if (!containerRef.current) return;
    if (osmdRef.current) return;
    osmdRef.current = await createOsmd(containerRef.current);
  }, []);

  useEffect(() => {
    void initOsmd();
    return () => {
      osmdRef.current = null;
    };
  }, [initOsmd]);

  const loadXml = useCallback(
    async (xml: string) => {
      if (!osmdRef.current) {
        await initOsmd();
        if (!osmdRef.current) return;
      }
      setError(null);
      try {
        await osmdRef.current.load(xml);
        osmdRef.current.render();
        setCurrentXml(xml);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      }
    },
    [initOsmd]
  );

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') loadXml(text);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadXml]
  );

  const handleSaveFile = useCallback(() => {
    if (!currentXml) {
      setError('No score loaded to save.');
      return;
    }
    setError(null);
    const blob = new Blob([currentXml], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'score.musicxml';
    a.click();
    URL.revokeObjectURL(url);
  }, [currentXml]);

  return (
    <div className="score-editor">
      <div className="score-editor__panel">
        <button type="button" className="score-editor__btn" onClick={handleOpenFile}>
          Open File
        </button>
        <button
          type="button"
          className="score-editor__btn"
          onClick={handleSaveFile}
          disabled={!currentXml}
        >
          Save File
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.musicxml,.mxl"
        onChange={handleFileChange}
        className="score-editor__file-input"
        aria-hidden
      />
      {error && <div className="score-editor__error" role="alert">{error}</div>}
      <div ref={containerRef} className="score-editor__osmd" />
    </div>
  );
}
