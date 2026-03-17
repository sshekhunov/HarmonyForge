import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearNoteHighlight,
  findClickedNote,
  highlightNoteAtIndex,
  type GraphicNote,
} from '../helpers/noteSelection';
import {
  selectionStoreClearSelection,
  selectionStoreConsumePendingHighlightIndex,
  selectionStoreSetMeasureList,
  selectionStoreSetSelectedNote,
} from '../helpers/selectionStore';
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
  const [musicXmlFile, setMusicXmlFile] = useState<string | null>(null);
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

  const loadXmlIntoOsmd = useCallback(
    async (xml: string) => {
      if (!osmdRef.current) {
        await initOsmd();
        if (!osmdRef.current) return;
      }
      setError(null);
      try {
        await osmdRef.current.load(xml);
        selectedNoteRef.current = null;
        selectionStoreClearSelection();
        osmdRef.current.render();

        const measureList = getMeasureList(osmdRef.current);
        selectionStoreSetMeasureList(measureList);

        const pendingIdx = selectionStoreConsumePendingHighlightIndex();
        if (pendingIdx !== null && measureList) {
          const highlighted = highlightNoteAtIndex(measureList, pendingIdx, '#c00');
          if (highlighted) {
            selectedNoteRef.current = highlighted;
            selectionStoreSetSelectedNote(highlighted);
          }
          osmdRef.current.render();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      }
    },
    [initOsmd]
  );

  useEffect(() => {
    if (musicXmlFile) void loadXmlIntoOsmd(musicXmlFile);
  }, [musicXmlFile, loadXmlIntoOsmd]);

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
        selectionStoreSetSelectedNote(clickedNote);
      } else {
        selectionStoreClearSelection();
      }

      osmd.render();
    },
    []
  );

  return (
    <div className="score-editor">
      <TopPanel
        musicXmlFile={musicXmlFile}
        setMusicXmlFile={setMusicXmlFile}
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
