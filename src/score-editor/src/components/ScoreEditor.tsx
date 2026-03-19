import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearAllNoteHighlights,
  clearNoteHighlight,
  findClickedNote,
  findNearestBeatOnStaff,
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
import { addNoteAtHoveredBeat } from '../helpers/noteDrawHelpers';

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

/**
 * Finds the top and bottom Y (SVG units) of the five staff lines near the given X/Y.
 */
function guessStaffBounds(svg: SVGSVGElement, x: number, nearY: number): { top: number; bottom: number } | null {
  const candidates: Array<{ y: number }> = [];
  const els = svg.querySelectorAll('path, line');
  for (const el of els) {
    const r = (el as SVGGraphicsElement).getBBox?.();
    if (!r) continue;
    if (r.width < 80) continue;
    if (r.height > 3) continue;
    if (x < r.x - 5 || x > r.x + r.width + 5) continue;
    const cy = r.y + r.height / 2;
    if (Math.abs(cy - nearY) > 300) continue;
    candidates.push({ y: cy });
  }
  if (candidates.length < 5) return null;
  candidates.sort((a, b) => Math.abs(a.y - nearY) - Math.abs(b.y - nearY));
  const nearest5 = candidates.slice(0, 5).map((c) => c.y);
  const top = Math.min(...nearest5);
  const bottom = Math.max(...nearest5);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) return null;
  return { top, bottom };
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

      if (editMode === 'draw') {
        const svg = scroller?.querySelector?.('svg') as SVGSVGElement | null;
        if (!svg) return;
        const anchor = findNearestBeatOnStaff(measureList as any, svg, e.clientX, e.clientY);
        if (!anchor) return;
        if (!musicDoc) return;
        const ctm = svg.getScreenCTM?.();
        if (!ctm) return;
        const inv = ctm.inverse();
        const rawPt = (typeof (globalThis as any).DOMPoint === 'function')
          ? new (globalThis as any).DOMPoint(e.clientX, e.clientY).matrixTransform(inv)
          : (() => {
              const p = svg.createSVGPoint();
              p.x = e.clientX;
              p.y = e.clientY;
              return p.matrixTransform(inv);
            })();
        const pt = { x: rawPt.x, y: rawPt.y };
        const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));
        const steps = clamp(-(pt.y - anchor.cy) / anchor.staffStep, -48, 48);
        const res = addNoteAtHoveredBeat(musicDoc, anchor.locator, steps, createDuration.id, createDuration.dots);
        if (!res) return;
        selectedNoteRef.current = null;
        selectionStoreSetSelectedNote(null);
        selectionStoreSetPendingLocator(res.pendingLocator);
        applyDocChange(res.doc);
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
      if (editMode === 'draw') {
        const osmd = osmdRef.current as IOsmdWithGraphic | null;
        const scroller = containerRef.current;
        if (!osmd || !scroller) return;
        const measureList = getMeasureList(osmd);
        if (!measureList) return;
        const svg = scroller.querySelector('svg') as SVGSVGElement | null;
        if (!svg) return;
        const anchor = findNearestBeatOnStaff(measureList as any, svg, e.clientX, e.clientY);
        if (!anchor) {
          const existing = drawPreviewRef.current;
          if (existing) {
            existing.g.parentNode?.removeChild(existing.g);
            drawPreviewRef.current = null;
            drawAnchorRef.current = null;
          }
          return;
        }
        const ctm = svg.getScreenCTM?.();
        if (!ctm) return;
        const inv = ctm.inverse();
        const rawPt = (typeof (globalThis as any).DOMPoint === 'function')
          ? new (globalThis as any).DOMPoint(e.clientX, e.clientY).matrixTransform(inv)
          : (() => {
              const p = svg.createSVGPoint();
              p.x = e.clientX;
              p.y = e.clientY;
              return p.matrixTransform(inv);
            })();
        const pt = { x: rawPt.x, y: rawPt.y };

        const { cx, cy: cy0, staffStep: staffStepFromAnchor, staffBounds: staffBoundsFromAnchor, locator } = anchor;
        const guessed = guessStaffBounds(svg, cx, cy0);
        const staffBounds = guessed ?? staffBoundsFromAnchor;
        const staffStep =
          staffBounds
            ? Math.max(0.5, ((staffBounds.bottom - staffBounds.top) / 4) / 2)
            : staffStepFromAnchor;
        const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));
        const steps = clamp(-(pt.y - cy0) / staffStep, -48, 48);
        const y = cy0 - steps * staffStep;
        drawAnchorRef.current = { locator, steps, svg };
        const drawPreviewRx = 6.5;
        const drawPreviewRy = 4.2;
        const drawPreviewLedgerHalf = 11;
        const existing = drawPreviewRef.current;
        if (!existing || existing.svg !== svg) {
          if (existing) existing.g.parentNode?.removeChild(existing.g);
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('data-hf-draw-preview', '1');
          svg.appendChild(g);
          drawPreviewRef.current = { svg, g };
        }
        const g = drawPreviewRef.current!.g;
        while (g.firstChild) g.removeChild(g.firstChild);
        const ns = 'http://www.w3.org/2000/svg';
        const headGroup = document.createElementNS(ns, 'g');
        headGroup.setAttribute('transform', `rotate(-25, ${cx}, ${y})`);
        const ell = document.createElementNS(ns, 'ellipse');
        ell.setAttribute('cx', String(cx));
        ell.setAttribute('cy', String(y));
        ell.setAttribute('rx', String(drawPreviewRx));
        ell.setAttribute('ry', String(drawPreviewRy));
        ell.setAttribute('fill', '#c00');
        headGroup.appendChild(ell);
        g.appendChild(headGroup);

        const topY = staffBounds?.top ?? (cy0 - 4 * staffStep);
        const bottomY = staffBounds?.bottom ?? (cy0 + 4 * staffStep);
        const beyondTopSteps = Math.max(0, Math.ceil((topY - y) / staffStep));
        const beyondBottomSteps = Math.max(0, Math.ceil((y - bottomY) / staffStep));
        const ys: number[] = [];
        const step2 = staffStep * 2;
        if (beyondTopSteps >= 2) {
          const lines = Math.floor(beyondTopSteps / 2);
          for (let i = 1; i <= lines; i++) ys.push(topY - i * step2);
        } else if (beyondBottomSteps >= 2) {
          const lines = Math.floor(beyondBottomSteps / 2);
          for (let i = 1; i <= lines; i++) ys.push(bottomY + i * step2);
        }
        const halfWidth = drawPreviewLedgerHalf;
        for (const ly of ys) {
          const line = document.createElementNS(ns, 'line');
          line.setAttribute('x1', String(cx - halfWidth));
          line.setAttribute('x2', String(cx + halfWidth));
          line.setAttribute('y1', String(ly));
          line.setAttribute('y2', String(ly));
          line.setAttribute('stroke', '#c00');
          line.setAttribute('stroke-width', '1');
          line.setAttribute('stroke-linecap', 'round');
          g.appendChild(line);
        }
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

      // Only clear selection when we actually moved the note (drag + drop). A simple click keeps the note selected.
      if (drag.moved) {
        selectedNoteRef.current = null;
        selectionStoreSetSelectedNote(null);
      }
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
      if (editMode === 'draw') {
        const prev = drawPreviewRef.current;
        if (prev) prev.g.parentNode?.removeChild(prev.g);
        drawPreviewRef.current = null;
        drawAnchorRef.current = null;
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
