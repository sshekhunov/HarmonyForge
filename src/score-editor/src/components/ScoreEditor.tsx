import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAccidentalToXml } from '../helpers/accidentalHelpers';
import {
  clearNoteHighlight,
  findClickedNote,
  getSelectedNoteIndex,
  highlightNoteAtIndex,
  type GraphicNote,
} from '../helpers/noteSelection';
import { TopPanel } from './TopPanel';
import './ScoreEditor.css';

// OSMD: use interface because the package's UMD bundle export doesn't match its .d.ts
interface IOSMDInstance {
  load(content: string | Document | Blob, tempTitle?: string): Promise<unknown>;
  render(): void;
}

/** OSMD internal: GraphicSheet has MeasureList and notes with getNoteheadSVGs for exact notehead hit-test */
interface IOsmdWithGraphic extends IOSMDInstance {
  GraphicSheet?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
  graphic?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
}

function getMeasureList(osmd: unknown): unknown[][] | null {
  const raw = osmd as {
    GraphicSheet?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
    graphic?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
  };
  const graphic = raw?.GraphicSheet ?? raw?.graphic;
  const list = graphic?.MeasureList ?? graphic?.measureList;
  return Array.isArray(list) ? list : null;
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
  const selectedNoteRef = useRef<GraphicNote | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentXml, setCurrentXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

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
        setHasSelection(false);
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

  const getSelectedNoteIndexCallback = useCallback((): number | null => {
    const measureList = getMeasureList(osmdRef.current);
    if (!measureList || !currentXml) return null;
    return getSelectedNoteIndex(measureList, selectedNoteRef.current?.sourceNote);
  }, [currentXml]);

  const applyAccidental = useCallback(
    async (alter: number, accidentalName: string) => {
      const noteIndex = getSelectedNoteIndexCallback();
      if (noteIndex === null || currentXml === null) return;
      const newXml = applyAccidentalToXml(currentXml, noteIndex, alter, accidentalName);
      if (newXml === null) return;
      setCurrentXml(newXml);
      await loadXml(newXml);
      const measureList = getMeasureList(osmdRef.current);
      if (measureList) {
        const highlighted = highlightNoteAtIndex(measureList, noteIndex, '#c00');
        if (highlighted) {
          selectedNoteRef.current = highlighted;
          setHasSelection(true);
        }
      }
      osmdRef.current?.render();
    },
    [currentXml, getSelectedNoteIndexCallback, loadXml]
  );

  const handleNatural = useCallback(() => applyAccidental(0, 'natural'), [applyAccidental]);
  const handleSharp = useCallback(() => applyAccidental(1, 'sharp'), [applyAccidental]);
  const handleFlat = useCallback(() => applyAccidental(-1, 'flat'), [applyAccidental]);
  const handleDoubleSharp = useCallback(() => applyAccidental(2, 'double-sharp'), [applyAccidental]);
  const handleDoubleFlat = useCallback(() => applyAccidental(-2, 'double-flat'), [applyAccidental]);
  const handleClearAccidental = useCallback(() => applyAccidental(0, ''), [applyAccidental]);

  const handleOsmdClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const osmd = osmdRef.current as IOsmdWithGraphic | null;
      if (!osmd || !containerRef.current) return;
      const measureList = getMeasureList(osmd);
      if (!measureList) return;

      const clickedNote = findClickedNote(
        measureList,
        e.clientX,
        e.clientY,
        e.target as Node
      );

      clearNoteHighlight(selectedNoteRef.current);
      selectedNoteRef.current = null;

      if (clickedNote?.sourceNote) {
        clickedNote.sourceNote.noteheadColor = '#c00';
        selectedNoteRef.current = clickedNote;
        setHasSelection(true);
      } else {
        setHasSelection(false);
      }

      osmd.render();
    },
    []
  );

  return (
    <div className="score-editor">
      <TopPanel
        canSave={!!currentXml}
        hasSelection={hasSelection}
        onOpen={handleOpenFile}
        onSave={handleSaveFile}
        onNatural={handleNatural}
        onSharp={handleSharp}
        onFlat={handleFlat}
        onDoubleSharp={handleDoubleSharp}
        onDoubleFlat={handleDoubleFlat}
        onClearAccidental={handleClearAccidental}
      />
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
