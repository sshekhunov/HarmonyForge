import { useCallback, useEffect, useRef, useState } from 'react';
import './ScoreEditor.css';

// OSMD: use interface because the package's UMD bundle export doesn't match its .d.ts
interface IOSMDInstance {
  load(content: string | Document | Blob, tempTitle?: string): Promise<unknown>;
  render(): void;
}

/** OSMD internal: GraphicSheet has GetNearestNote; click coords must be in sheet units (px/10/zoom) */
interface IOsmdWithGraphic extends IOSMDInstance {
  GraphicSheet?: {
    GetNearestNote(clickPos: { x: number; y: number }, maxDist: { x: number; y: number }): { sourceNote?: { noteheadColor?: string } } | null;
  };
  Zoom?: number;
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
  const selectedNoteRef = useRef<{ sourceNote?: { noteheadColor?: string } } | null>(null);
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
        selectedNoteRef.current = null;
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

  const handleOsmdClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const osmd = osmdRef.current as IOsmdWithGraphic | null;
      const container = containerRef.current;
      if (!osmd || !container) return;
      const raw = osmd as unknown as { GraphicSheet?: { GetNearestNote: (a: { x: number; y: number }, b: { x: number; y: number }) => unknown }; graphic?: { GetNearestNote: (a: { x: number; y: number }, b: { x: number; y: number }) => unknown }; Zoom?: number };
      const graphic = raw.GraphicSheet ?? raw.graphic;
      if (!graphic?.GetNearestNote) return;

      const rect = container.getBoundingClientRect();
      const zoom = Number(raw.Zoom) || 1;
      const unitScale = 10 * zoom;
      const contentX = e.clientX - rect.left + container.scrollLeft;
      const contentY = e.clientY - rect.top + container.scrollTop;
      const sheetPoint = { x: contentX / unitScale, y: contentY / unitScale };
      const maxDist = { x: 15, y: 15 };
      const note = graphic.GetNearestNote(sheetPoint, maxDist) as { sourceNote?: { noteheadColor?: string } } | null;

      // Clear previous selection
      if (selectedNoteRef.current?.sourceNote && 'noteheadColor' in selectedNoteRef.current.sourceNote) {
        delete selectedNoteRef.current.sourceNote.noteheadColor;
      }
      selectedNoteRef.current = null;

      if (note?.sourceNote) {
        note.sourceNote.noteheadColor = '#c00';
        selectedNoteRef.current = note;
      }

      osmd.render();
    },
    []
  );

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
      <div
        ref={containerRef}
        className="score-editor__osmd"
        onClick={handleOsmdClick}
        role="application"
        aria-label="Score: click a note to select it"
      />
    </div>
  );
}
