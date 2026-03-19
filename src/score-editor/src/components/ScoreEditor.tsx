import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearNoteHighlight,
  findClickedNote,
  getSelectedNoteLocator,
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
import { noteDragPointerCancel, noteDragPointerDown, noteDragPointerMove, noteDragPointerUp, type NoteDragState } from '../helpers/noteDragHelpers';
import { TopPanel } from './TopPanel';
import './ScoreEditor.css';
import type { EditMode } from './Tools/EditModeTools';
import { eraseNoteAtLocator } from '../helpers/noteEraseHelpers';

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
  const [musicDoc, setMusicDoc] = useState<MusicXmlDocument | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [editMode, setEditMode] = useState<EditMode>('select');
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
        const clicked = findClickedNote(measureList, e.clientX, e.clientY, e.target as Node);
        if (!clicked?.sourceNote) return;
        if ((clicked.sourceNote as any)?.isRest?.()) return;
        if (!musicDoc) return;
        const locator = getSelectedNoteLocator(measureList as any, clicked.sourceNote as any);
        if (!locator) return;
        const next = eraseNoteAtLocator(musicDoc, locator);
        if (!next) return;
        hoverEraseNoteRef.current = null;
        selectedNoteRef.current = null;
        selectionStoreSetSelectedNote(null);
        selectionStoreSetPendingLocator(null);
        applyDocChange(next);
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const drag = noteDragPointerDown({
        measureList: measureList as any,
        clientX: e.clientX,
        clientY: e.clientY,
        fallbackTarget: e.target as Node,
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
    [editMode, musicDoc]
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
        const hovered = findClickedNote(measureList, e.clientX, e.clientY, e.target as Node);
        if (hovered === hoverEraseNoteRef.current) return;
        clearNoteHighlight(hoverEraseNoteRef.current);
        hoverEraseNoteRef.current = hovered;
        if (hovered?.sourceNote && !(hovered.sourceNote as any)?.isRest?.()) {
          hovered.sourceNote.noteheadColor = '#c00';
        }
        osmd.render();
        e.preventDefault();
        return;
      }
      if (!drag?.active) return;
      if (e.pointerId !== drag.pointerId) return;

      noteDragPointerMove(drag, e.clientX, e.clientY, zoom);
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

      selectedNoteRef.current = null;
      selectionStoreSetSelectedNote(null);
      noteDragPointerUp(drag, musicDoc, selectionStoreSetPendingLocator, (doc) => applyDocChange(doc));
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
      if (!drag?.active) return;
      if (e.pointerId !== drag.pointerId) return;
      noteDragPointerCancel(drag);
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
        editMode={editMode}
        setEditMode={setEditMode}
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
