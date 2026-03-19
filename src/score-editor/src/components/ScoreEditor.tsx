import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearAllNoteHighlights,
  clearNoteHighlight,
  findClickedNote,
  highlightNoteByLocator,
} from '../helpers/noteSelection';
import type { GraphicNote } from '../models/osmd';
import type { MusicXmlDocument } from '../models/musicXmlDocument';
import {
  selectionStoreClearSelection,
  selectionStoreClearPendingLocator,
  selectionStorePeekPendingLocator,
  selectionStoreSetMeasureList,
  selectionStoreSetPendingLocator,
  selectionStoreSetSelectedNote,
} from '../helpers/selectionStore';
import { historyClearApplying, historyIsApplying, historyRecord, historyReset } from '../services/historyService';
import { musicXmlToString } from '../helpers/musicXmlHelper';
import type { NoteDragState } from '../helpers/noteDragHelpers';
import { TopPanel } from './TopPanel';
import './ScoreEditor.css';
import type { EditMode } from './Tools/EditModeTools';
import {
  drawModeCancel,
  drawModePointerDown,
  drawModePointerMove,
  eraseModePointerDown,
  eraseModePointerMove,
  selectModeCancel,
  selectModePointerDown,
  selectModePointerMove,
  selectModePointerUp,
} from '../helpers/editModePointerHelpers';

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
  const dragRef = useRef<NoteDragState | null>(null);
  const hoverEraseNoteRef = useRef<GraphicNote | null>(null);
  const drawPreviewRef = useRef<{ svg: SVGSVGElement; g: SVGGElement } | null>(null);
  const drawAnchorRef = useRef<{ locator: any; steps: number; svg: SVGSVGElement } | null>(null);
  const [musicDoc, setMusicDoc] = useState<MusicXmlDocument | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [editMode, setEditMode] = useState<EditMode>('select');
  const [createDuration, setCreateDuration] = useState<{ id: any; dots: 0 | 1 | 2 }>({ id: 'quarter', dots: 0 });
  const [error, setError] = useState<string | null>(null);
  const pendingScrollRef = useRef<{ top: number; left: number } | null>(null);

  const restoreScrollBurst = useCallback((scroller: HTMLDivElement, target: { top: number; left: number }) => {  
    let framesLeft = 12;
    const tick = () => {
      scroller.scrollTop = target.top;
      scroller.scrollLeft = target.left;
      framesLeft--;
      if (framesLeft > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

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
        // Only clear selection if we are not going to restore it.
        if (!selectionStorePeekPendingLocator()) selectionStoreClearSelection();
        osmdRef.current.render();

        const measureList = getMeasureList(osmdRef.current);
        selectionStoreSetMeasureList(measureList);

        const pending = selectionStorePeekPendingLocator();
        if (pending && measureList) {
          let attemptsLeft = 10;
          const tryRehighlight = () => {
            const ml = getMeasureList(osmdRef.current);
            if (!ml) return;
            const highlighted = highlightNoteByLocator(ml, pending, '#c00');
            if (highlighted) {
              selectedNoteRef.current = highlighted;
              selectionStoreSetSelectedNote(highlighted);
              selectionStoreClearPendingLocator();
              osmdRef.current?.render();
              return;
            }
            attemptsLeft--;
            if (attemptsLeft > 0) requestAnimationFrame(tryRehighlight);
          };
          tryRehighlight();
        }

        const scroller = containerRef.current;
        const pendingScroll = pendingScrollRef.current;
        if (scroller && pendingScroll) {
          restoreScrollBurst(scroller, pendingScroll);
          pendingScrollRef.current = null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      }
    },
    [initOsmd]
  );

  useEffect(() => {
    const xml = musicDoc ? musicXmlToString(musicDoc) : null;
    if (xml) void loadXmlIntoOsmd(xml);
  }, [musicDoc, loadXmlIntoOsmd]);

  useEffect(() => {
    const osmd = osmdRef.current;
    const scroller = containerRef.current;
    if (!osmd || !scroller) return;
    const scrollBefore = { top: scroller.scrollTop, left: scroller.scrollLeft };
    // Rerender after zoom change so layout recalculates.
    requestAnimationFrame(() => {
      osmd.render();
      restoreScrollBurst(scroller, scrollBefore);
    });
  }, [zoom, restoreScrollBurst]);

  const handleSetZoom = useCallback((next: number) => {
    const scroller = containerRef.current;
    if (scroller) pendingScrollRef.current = { top: scroller.scrollTop, left: scroller.scrollLeft };
    setZoom(next);
  }, []);

  const applyDocChange = useCallback((nextDoc: MusicXmlDocument | null) => {
    const prevDoc = musicDoc;
    if (prevDoc && containerRef.current) {
      pendingScrollRef.current = {
        top: containerRef.current.scrollTop,
        left: containerRef.current.scrollLeft,
      };
    } else {
      pendingScrollRef.current = null;
    }
    if (!prevDoc) {
      historyReset();
    } else if (!historyIsApplying() && nextDoc) {
      historyRecord(musicXmlToString(prevDoc), musicXmlToString(nextDoc));
    }
    historyClearApplying();
    setMusicDoc(nextDoc);
  }, [musicDoc]);

  const handleOsmdClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (editMode === 'erase') return;
      // If pointer-dragging moved the note, suppress the click selection toggle.
      const drag = dragRef.current;
      if (drag?.active || drag?.moved) return;
      const osmd = osmdRef.current as IOsmdWithGraphic | null;
      if (!osmd || !containerRef.current) return;
      const scroller = containerRef.current;
      const scrollBefore = { top: scroller.scrollTop, left: scroller.scrollLeft };
      const measureList = getMeasureList(osmd);
      if (!measureList) return;

      const clickedNote = findClickedNote(
        measureList,
        e.clientX,
        e.clientY,
        e.target as Node
      );

      clearAllNoteHighlights(measureList as any);

      if (clickedNote?.sourceNote) {
        clickedNote.sourceNote.noteheadColor = '#c00';
        selectedNoteRef.current = clickedNote;
        selectionStoreSetSelectedNote(clickedNote);
      } else {
        selectedNoteRef.current = null;
        selectionStoreClearSelection();
      }

      osmd.render();
      restoreScrollBurst(scroller, scrollBefore);
    },
    [editMode, restoreScrollBurst]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const osmd = osmdRef.current as IOsmdWithGraphic | null;
      const scroller = containerRef.current;
      if (!osmd || !scroller) return;
      const measureList = getMeasureList(osmd);
      if (!measureList) return;

      if (editMode === 'erase') {
        const handled = eraseModePointerDown({
          measureList: measureList as any,
          clientX: e.clientX,
          clientY: e.clientY,
          target: e.target as Node,
          musicDoc,
          applyDocChange,
          setSelectedNote: (n) => {
            selectedNoteRef.current = n;
            selectionStoreSetSelectedNote(n);
          },
          setPendingLocator: (loc) => selectionStoreSetPendingLocator(loc as any),
          clearHover: () => { hoverEraseNoteRef.current = null; },
        });
        if (!handled) return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (editMode === 'draw') {
        const svg = scroller?.querySelector?.('svg') as SVGSVGElement | null;
        if (!svg) return;
        const handled = drawModePointerDown({
          measureList: measureList as any,
          svg,
          clientX: e.clientX,
          clientY: e.clientY,
          musicDoc,
          createDuration,
          applyDocChange,
          setSelectedNote: (n) => {
            selectedNoteRef.current = n;
            selectionStoreSetSelectedNote(n);
          },
          setPendingLocator: (loc) => selectionStoreSetPendingLocator(loc as any),
        });
        if (!handled) return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const drag = selectModePointerDown({
        measureList: measureList as any,
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.target as Node,
        pointerId: e.pointerId,
        button: e.button,
        prevSelectedNote: selectedNoteRef.current,
        onSelect: (note) => {
          selectedNoteRef.current = note;
          selectionStoreSetSelectedNote(note);
          osmd.render();
        },
      });
      if (!drag) return;
      dragRef.current = drag;

      scroller.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    },
    [applyDocChange, createDuration.dots, createDuration.id, editMode, musicDoc]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (editMode === 'erase') {
        const osmd = osmdRef.current as IOsmdWithGraphic | null;
        const scroller = containerRef.current;
        if (!osmd || !scroller) return;
        const measureList = getMeasureList(osmd);
        if (!measureList) return;
        eraseModePointerMove({
          measureList: measureList as any,
          clientX: e.clientX,
          clientY: e.clientY,
          target: e.target as Node,
          osmdRender: () => osmd.render(),
          getHover: () => hoverEraseNoteRef.current,
          setHover: (n) => { hoverEraseNoteRef.current = n; },
        });
        e.preventDefault();
        return;
      }
      if (editMode === 'draw') {
        const osmd = osmdRef.current as IOsmdWithGraphic | null;
        const scroller = containerRef.current;
        if (!osmd || !scroller) return;
        const measureList = getMeasureList(osmd);
        if (!measureList) return;
        const svg = scroller.querySelector('svg') as SVGSVGElement | null;
        if (!svg) return;
        drawModePointerMove({
          measureList: measureList as any,
          svg,
          clientX: e.clientX,
          clientY: e.clientY,
          drawPreview: drawPreviewRef.current,
          setDrawPreview: (v) => { drawPreviewRef.current = v; },
          setDrawAnchor: (v) => { drawAnchorRef.current = v; },
        });
        e.preventDefault();
        return;
      }
      if (!drag?.active) return;
      if (e.pointerId !== drag.pointerId) return;

      selectModePointerMove(drag, e.clientX, e.clientY, zoom);
      e.preventDefault();
      e.stopPropagation();
    },
    [editMode, zoom]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (editMode === 'erase') return;
      const drag = dragRef.current;
      if (!drag?.active) return;
      if (e.pointerId !== drag.pointerId) return;

      // Only clear selection when we actually moved the note (drag + drop). A simple click keeps the note selected.
      if (drag.moved) {
        selectedNoteRef.current = null;
        selectionStoreSetSelectedNote(null);
      }
      selectModePointerUp({
        drag,
        musicDoc,
        setPendingLocator: (loc) => selectionStoreSetPendingLocator(loc as any),
        setDoc: (doc) => applyDocChange(doc),
      });
      dragRef.current = null;
      e.preventDefault();
      e.stopPropagation();
    },
    [applyDocChange, editMode, musicDoc]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (editMode === 'erase') {
        const osmd = osmdRef.current as IOsmdWithGraphic | null;
        if (osmd) {
          clearNoteHighlight(hoverEraseNoteRef.current);
          hoverEraseNoteRef.current = null;
          osmd.render();
        }
        return;
      }
      if (editMode === 'draw') {
        drawModeCancel({
          drawPreview: drawPreviewRef.current,
          setDrawPreview: (v) => { drawPreviewRef.current = v; },
          setDrawAnchor: (v) => { drawAnchorRef.current = v; },
        });
        return;
      }
      if (!drag?.active) return;
      if (e.pointerId !== drag.pointerId) return;
      selectModeCancel(drag);
      dragRef.current = null;
    },
    [editMode]
  );

  return (
    <div className="score-editor">
      <TopPanel
        musicDoc={musicDoc}
        zoom={zoom}
        setZoom={handleSetZoom}
        setMusicDoc={applyDocChange}
        onOpenFile={(doc) => {
          historyReset();
          setMusicDoc(doc);
        }}
        editMode={editMode}
        setEditMode={setEditMode}
        onDurationSelectionChange={(id, dots) => setCreateDuration({ id, dots })}
      />
      <div className="score-editor__viewport">
        {error && <div className="score-editor__error" role="alert">{error}</div>}
        <div
          ref={containerRef}
          className={`score-editor__osmd${editMode === 'erase' ? ' is-erase-mode' : ' is-select-mode'}`}
          style={{ ['--osmd-zoom' as any]: zoom } as React.CSSProperties}
          onClick={handleOsmdClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          role="application"
          aria-label="Score: click a note to select it"
        />
      </div>
    </div>
  );
}
