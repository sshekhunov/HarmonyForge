import type { MusicXmlDocument, MusicXmlPitch } from '../models/musicXmlDocument';
import type { NoteLocator } from '../models/musicXml';
import { getIndexedPart } from './musicXmlHelper';
import type { GraphicNote } from '../models/osmd';
import { clearAccidental } from './accidentalHelpers';
import { clearNoteHighlight, findClickedNote, getSelectedNoteLocator } from './noteSelection';
import type { MeasureList } from '../models/osmd';

const STEPS: Array<MusicXmlPitch['step']> = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function isStep(s: string): s is MusicXmlPitch['step'] {
  return STEPS.includes(s as any);
}

function clampInt(n: number, min: number, max: number): number {
  const v = Math.round(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * Estimates the pixel distance for one diatonic staff step (line->space).
 * Uses the notehead height as a heuristic so it adapts to zoom and engraving.
 */
export function estimateStaffStepPx(note: GraphicNote | null): number {
  const r = note?.getNoteheadSVGs?.()?.[0]?.getBoundingClientRect?.();
  const est = r ? r.height / 2 : 6;
  return Math.max(2, Math.min(40, est));
}

/**
 * Converts a vertical drag delta into diatonic steps (up is positive).
 */
export function diatonicStepsFromDragDelta(deltaYPx: number, staffStepPx: number): number {
  const step = staffStepPx > 0 ? staffStepPx : 6;
  return clampInt(raw, -48, 48);
}

/**
 * Transposes a pitch by diatonic staff steps (no key signature logic).
 * Keeps `alter` as-is; accidental tools handle chromatic changes separately.
 */
export function transposePitchDiatonic(pitch: MusicXmlPitch, diatonicSteps: number): MusicXmlPitch {
  if (!pitch?.step || typeof pitch.octave !== 'number' || !Number.isFinite(pitch.octave)) return pitch;
  if (!isStep(pitch.step)) return pitch;
  const steps = Math.trunc(diatonicSteps);
  if (!Number.isFinite(steps) || steps === 0) return pitch;

  const startIdx = STEPS.indexOf(pitch.step);
  const total = startIdx + steps;
  const nextIdx = ((total % 7) + 7) % 7;
  const octaveDelta = Math.floor(total / 7);

  return {
    ...pitch,
    step: STEPS[nextIdx]!,
    octave: pitch.octave + octaveDelta,
  };
}

/**
 * Applies a diatonic pitch drag to the note referenced by the locator.
 * Returns a new document model or null if the note can't be found.
 */
export function applyPitchDragDiatonic(
  doc: MusicXmlDocument,
  locator: NoteLocator,
  diatonicSteps: number
): MusicXmlDocument | null {
  if (!doc?.parts?.length) return null;
  if (!locator) return null;
  if (!Number.isFinite(diatonicSteps) || Math.trunc(diatonicSteps) === 0) return doc;

  const part = getIndexedPart(doc, locator.partId);
  if (!part) return null;
  const measure = part.measures[locator.measureIndex];
  if (!measure) return null;

  let pitchIndex = 0;
  const nextElements = measure.elements.map((el) => {
    if (el.kind !== 'note') return el;
    if (el.staff !== locator.staffNumber) return el;
    if (locator.voice && el.voice && el.voice !== locator.voice) return el;
    if (!el.pitch) return el;

    const isTarget = pitchIndex === locator.indexInMeasure;
    pitchIndex++;
    if (!isTarget) return el;

    const nextPitch = transposePitchDiatonic(el.pitch, diatonicSteps);
    return nextPitch === el.pitch ? el : { ...el, pitch: nextPitch };
  });

  if (pitchIndex <= locator.indexInMeasure) return null;

  const nextDoc: MusicXmlDocument = {
    ...doc,
    parts: doc.parts.map((p) => {
      if (p !== part) return p;
      return {
        ...p,
        measures: p.measures.map((m) => {
          if (m !== measure) return m;
          return { ...m, elements: nextElements };
        }),
      };
    }),
  };

  return clearAccidental(nextDoc, locator) ?? nextDoc;
}

export type NoteDragState = {
  active: boolean;
  moved: boolean;
  pointerId: number;
  startClientY: number;
  lastClientY: number;
  staffStepPx: number;
  staffStepSvg: number;
  color: string;
  note: GraphicNote;
  locator: NoteLocator;
  noteheadEls: Element[];
  staffTopY: number;
  staffBottomY: number;
  noteCenterX: number;
  noteCenterYSvg: number;
  ledgerGroup: SVGGElement | null;
  svgUnitsPerPx: number;
};

function clearDragPreview(els: Element[]) {
  for (const el of els) {
    const html = el as HTMLElement;
    html.style.transform = '';
    html.style.transformOrigin = '';
    html.style.willChange = '';
    html.style.transition = '';
  }
}

function applyDragPreview(els: Element[], yPx: number) {
  for (const el of els) {
    const html = el as HTMLElement;
    html.style.willChange = 'transform';
    html.style.transformOrigin = 'center';
    html.style.transform = `translateY(${yPx}px)`;
  }
}

function applySelectedColorPreview(els: Element[], color: string) {
  for (const el of els) {
    const root = el as unknown as Element;
    const paint = (node: Element) => {
      const s = (node as any).style as CSSStyleDeclaration | undefined;
      if (!s) return;
      (s as any).fill = color;
      (s as any).stroke = color;
    };
    paint(root);
    for (const n of Array.from(root.querySelectorAll?.('path, ellipse, circle, rect') ?? [])) paint(n);
  }
}

function getClosestSvg(el: Element | null): SVGSVGElement | null {
  let cur: Element | null = el;
  while (cur) {
    if (cur instanceof SVGSVGElement) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function guessStaffBounds(svg: SVGSVGElement, noteCenterX: number, nearY: number): { top: number; bottom: number } | null {
  const candidates: Array<{ y: number; top: number; bottom: number }> = [];
  const els = svg.querySelectorAll('path, line');
  for (const el of els) {
    const r = (el as SVGGraphicsElement).getBBox?.();
    if (!r) continue;
    if (r.width < 80) continue;
    if (r.height > 3) continue;
    if (noteCenterX < r.x - 5 || noteCenterX > r.x + r.width + 5) continue;
    const cy = r.y + r.height / 2;
    if (Math.abs(cy - nearY) > 300) continue;
    candidates.push({ y: cy, top: r.y, bottom: r.y + r.height });
  }
  if (candidates.length < 5) return null;
  candidates.sort((a, b) => Math.abs(a.y - nearY) - Math.abs(b.y - nearY));
  const nearest5 = candidates.slice(0, 5);
  const top = Math.min(...nearest5.map((c) => c.y));
  const bottom = Math.max(...nearest5.map((c) => c.y));
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) return null;
  return { top, bottom };
}

function estimateStaffStepSvgFromNotehead(notehead: Element | null): number {
  const g = notehead as unknown as SVGGraphicsElement | null;
  const r = g?.getBBox?.();
  const est = r ? r.height / 2 : 3;
  return Math.max(0.5, Math.min(50, est));
}

function clientToSvg(svgEl: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const ctm = svgEl.getScreenCTM?.();
  if (!ctm) return null;
  const inv = ctm.inverse();
  const p = new DOMPoint(clientX, clientY).matrixTransform(inv);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  return { x: p.x, y: p.y };
}

function estimateSvgUnitsPerPx(svgEl: SVGSVGElement): number {
  const ctm = svgEl.getScreenCTM?.();
  if (!ctm) return 1;
  const inv = ctm.inverse();
  const v = inv.d;
  return Number.isFinite(v) && v !== 0 ? v : 1;
}

function ensureLedgerGroup(svg: SVGSVGElement): SVGGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('data-hf-ledgers', '1');
  svg.appendChild(g);
  return g;
}

function clearLedgerLines(group: SVGGElement | null) {
  if (!group) return;
  while (group.firstChild) group.removeChild(group.firstChild);
}

function removeLedgerGroup(group: SVGGElement | null) {
  if (!group) return;
  group.parentNode?.removeChild(group);
}

function drawLedgerLines(
  group: SVGGElement,
  noteCenterX: number,
  halfWidth: number,
  ys: number[],
  stroke: string
) {
  const ns = 'http://www.w3.org/2000/svg';
  clearLedgerLines(group);
  for (const y of ys) {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', String(noteCenterX - halfWidth));
    line.setAttribute('x2', String(noteCenterX + halfWidth));
    line.setAttribute('y1', String(y));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', stroke);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-linecap', 'round');
    group.appendChild(line);
  }
}

export type NoteDragStartArgs = {
  measureList: MeasureList;
  clientX: number;
  clientY: number;
  fallbackTarget?: Node;
  pointerId: number;
  button: number;
  prevSelectedNote: GraphicNote | null;
  onSelect: (note: GraphicNote) => void;
};

export function noteDragPointerDown(args: NoteDragStartArgs): NoteDragState | null {
  if (args.button !== 0) return null;

  const clickedNote = findClickedNote(
    args.measureList,
    args.clientX,
    args.clientY,
    args.fallbackTarget
  );
  if (!clickedNote?.sourceNote) return null;
  if ((clickedNote.sourceNote as any)?.isRest?.()) return null;

  const locator = getSelectedNoteLocator(args.measureList, clickedNote.sourceNote as any);
  if (!locator) return null;

  clearNoteHighlight(args.prevSelectedNote);
  clickedNote.sourceNote.noteheadColor = '#c00';
  const color = clickedNote.sourceNote.noteheadColor ?? '#c00';
  args.onSelect(clickedNote);

  const noteheadEls = (clickedNote.getNoteheadSVGs?.() ?? []).filter(Boolean) as Element[];
  const firstHead = noteheadEls[0] ?? null;
  const svg = getClosestSvg(firstHead);
  const svgUnitsPerPx = svg ? estimateSvgUnitsPerPx(svg) : 1;
  const svgPt = svg ? clientToSvg(svg, args.clientX, args.clientY) : null;

  applySelectedColorPreview(noteheadEls, color);

   const headBox = (firstHead as unknown as SVGGraphicsElement | null)?.getBBox?.() ?? null;
   const noteCenterX = headBox ? headBox.x + headBox.width / 2 : (svgPt?.x ?? 0);
  const noteCenterYSvg = headBox ? headBox.y + headBox.height / 2 : (svgPt?.y ?? 0);

  const bounds = svg ? guessStaffBounds(svg, noteCenterX, noteCenterYSvg) : null;
  const staffTopY = bounds?.top ?? (noteCenterYSvg - 4 * estimateStaffStepSvgFromNotehead(firstHead));
  const staffBottomY = bounds?.bottom ?? (noteCenterYSvg + 4 * estimateStaffStepSvgFromNotehead(firstHead));
   const staffStepSvg =
    bounds
      ? Math.max(0.5, Math.min(50, ((staffBottomY - staffTopY) / 4) / 2))
      : estimateStaffStepSvgFromNotehead(firstHead);
  const staffStepPx = Math.max(1, Math.min(80, staffStepSvg / (svgUnitsPerPx || 1)));
  const ledgerGroup = svg ? ensureLedgerGroup(svg) : null;

  return {
    active: true,
    moved: false,
    pointerId: args.pointerId,
    startClientY: args.clientY,
    lastClientY: args.clientY,
    staffStepPx,
    staffStepSvg,
    color,
    note: clickedNote,
    locator,
    noteheadEls,
    staffTopY,
    staffBottomY,
    noteCenterX,
    noteCenterYSvg,
    ledgerGroup,
    svgUnitsPerPx,
  };
}

export function noteDragPointerMove(
  drag: NoteDragState,
  clientY: number,
  zoom: number
): void {
  if (!drag.active) return;
  const dy = clientY - drag.startClientY;
  drag.lastClientY = clientY;
  if (Math.abs(dy) >= 3) drag.moved = true;

  const diatonicSteps = diatonicStepsFromDragDelta(dy, drag.staffStepPx);
  const z = typeof zoom === 'number' && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const snappedDyScreenPx = -diatonicSteps * drag.staffStepPx;
  const snappedDyLocalPx = snappedDyScreenPx / z;
  applyDragPreview(drag.noteheadEls, snappedDyLocalPx);

  const snappedDySvg = snappedDyScreenPx * (drag.svgUnitsPerPx || 1);
  const projectedCenterYSvg = drag.noteCenterYSvg + snappedDySvg;
  const beyondTopSteps = Math.max(0, Math.ceil((drag.staffTopY - projectedCenterYSvg) / drag.staffStepSvg));
  const beyondBottomSteps = Math.max(0, Math.ceil((projectedCenterYSvg - drag.staffBottomY) / drag.staffStepSvg));

  const ys: number[] = [];
  const step2 = drag.staffStepSvg * 2;
  if (beyondTopSteps >= 2) {
    const lines = Math.floor(beyondTopSteps / 2);
    for (let i = 1; i <= lines; i++) ys.push(drag.staffTopY - i * step2);
  } else if (beyondBottomSteps >= 2) {
    const lines = Math.floor(beyondBottomSteps / 2);
    for (let i = 1; i <= lines; i++) ys.push(drag.staffBottomY + i * step2);
  }

  if (drag.ledgerGroup) {
    const headBox = (drag.noteheadEls[0] as unknown as SVGGraphicsElement | null)?.getBBox?.() ?? null;
    const halfWidth = headBox ? Math.max(5, headBox.width * 0.7) : 10;
    drawLedgerLines(drag.ledgerGroup, drag.noteCenterX, halfWidth, ys, drag.color);
  }
}

export function noteDragPointerCancel(
  drag: NoteDragState,
): void {
  drag.active = false;
  clearDragPreview(drag.noteheadEls);
  clearLedgerLines(drag.ledgerGroup);
  removeLedgerGroup(drag.ledgerGroup);
  drag.ledgerGroup = null;
}

export function noteDragPointerUp(
  drag: NoteDragState,
  currentDoc: MusicXmlDocument | null,
  setPendingLocator: (locator: NoteLocator) => void,
  setDoc: (doc: MusicXmlDocument) => void
): void {
  drag.active = false;
  clearDragPreview(drag.noteheadEls);
  clearLedgerLines(drag.ledgerGroup);
  removeLedgerGroup(drag.ledgerGroup);
  drag.ledgerGroup = null;

  if (!currentDoc) return;
  if (!drag.moved) return;
  const dy = drag.lastClientY - drag.startClientY;
  const diatonicSteps = diatonicStepsFromDragDelta(dy, drag.staffStepPx);
  if (diatonicSteps === 0) return;

  const next = applyPitchDragDiatonic(currentDoc, drag.locator, diatonicSteps);
  if (!next) return;
  setPendingLocator(drag.locator);
  setDoc(next);
}

