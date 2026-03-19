import type { GraphicNote, MeasureList } from '../models/osmd';
import type { MusicXmlDocument } from '../models/musicXmlDocument';
import type { NoteLocator } from '../models/musicXml';
import { clearNoteHighlight, findClickedNote, findNearestBeatOnStaff, getSelectedNoteLocator } from './noteSelection';
import { eraseNoteAtLocator } from './noteEraseHelpers';
import { addNoteAtHoveredBeat } from './noteDrawHelpers';
import { noteDragPointerCancel, noteDragPointerDown, noteDragPointerMove, noteDragPointerUp, type NoteDragState } from './noteDragHelpers';

export type DurationValue = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th';
export type DotValue = 0 | 1 | 2;

type ApplyDocChange = (doc: MusicXmlDocument | null) => void;

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

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  try {
    const ctm = svg.getScreenCTM?.();
    if (!ctm) return null;
    const inv = ctm.inverse();
    if (typeof (globalThis as any).DOMPoint === 'function') {
      const p = new (globalThis as any).DOMPoint(clientX, clientY).matrixTransform(inv);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      return { x: p.x, y: p.y };
    }
    const pt = svg.createSVGPoint?.();
    if (!pt) return null;
    pt.x = clientX;
    pt.y = clientY;
    const p2 = pt.matrixTransform(inv);
    if (!Number.isFinite(p2.x) || !Number.isFinite(p2.y)) return null;
    return { x: p2.x, y: p2.y };
  } catch {
    return null;
  }
}

export function eraseModePointerDown(args: {
  measureList: MeasureList;
  clientX: number;
  clientY: number;
  target: Node;
  musicDoc: MusicXmlDocument | null;
  applyDocChange: ApplyDocChange;
  setSelectedNote: (note: GraphicNote | null) => void;
  setPendingLocator: (loc: NoteLocator | null) => void;
  clearHover: () => void;
}): boolean {
  const clicked = findClickedNote(args.measureList, args.clientX, args.clientY, args.target);
  if (!clicked?.sourceNote) return false;
  if ((clicked.sourceNote as any)?.isRest?.()) return false;
  if (!args.musicDoc) return false;
  const locator = getSelectedNoteLocator(args.measureList, clicked.sourceNote as any);
  if (!locator) return false;
  const next = eraseNoteAtLocator(args.musicDoc, locator);
  if (!next) return false;
  args.clearHover();
  args.setSelectedNote(null);
  args.setPendingLocator(null);
  args.applyDocChange(next);
  return true;
}

export function eraseModePointerMove(args: {
  measureList: MeasureList;
  clientX: number;
  clientY: number;
  target: Node;
  osmdRender: () => void;
  getHover: () => GraphicNote | null;
  setHover: (note: GraphicNote | null) => void;
}): boolean {
  const hovered = findClickedNote(args.measureList, args.clientX, args.clientY, args.target);
  if (hovered === args.getHover()) return true;
  clearNoteHighlight(args.getHover());
  args.setHover(hovered);
  if (hovered?.sourceNote && !(hovered.sourceNote as any)?.isRest?.()) {
    hovered.sourceNote.noteheadColor = '#c00';
  }
  args.osmdRender();
  return true;
}

export function drawModePointerDown(args: {
  measureList: MeasureList;
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
  musicDoc: MusicXmlDocument | null;
  createDuration: { id: DurationValue; dots: DotValue };
  applyDocChange: ApplyDocChange;
  setSelectedNote: (note: GraphicNote | null) => void;
  setPendingLocator: (loc: NoteLocator | null) => void;
}): boolean {
  const anchor = findNearestBeatOnStaff(args.measureList, args.svg, args.clientX, args.clientY);
  if (!anchor) return false;
  if (!args.musicDoc) return false;
  const pt = clientToSvg(args.svg, args.clientX, args.clientY);
  if (!pt) return false;
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));
  const steps = clamp(-(pt.y - anchor.cy) / anchor.staffStep, -48, 48);
  const res = addNoteAtHoveredBeat(args.musicDoc, anchor.locator, steps, args.createDuration.id, args.createDuration.dots);
  if (!res) return false;
  args.setSelectedNote(null);
  args.setPendingLocator(res.pendingLocator);
  args.applyDocChange(res.doc);
  return true;
}

export function drawModePointerMove(args: {
  measureList: MeasureList;
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
  drawPreview: { svg: SVGSVGElement; g: SVGGElement } | null;
  setDrawPreview: (v: { svg: SVGSVGElement; g: SVGGElement } | null) => void;
  setDrawAnchor: (v: { locator: NoteLocator; steps: number; svg: SVGSVGElement } | null) => void;
}): boolean {
  const anchor = findNearestBeatOnStaff(args.measureList, args.svg, args.clientX, args.clientY);
  if (!anchor) {
    const existing = args.drawPreview;
    if (existing) existing.g.parentNode?.removeChild(existing.g);
    args.setDrawPreview(null);
    args.setDrawAnchor(null);
    return true;
  }
  const pt = clientToSvg(args.svg, args.clientX, args.clientY);
  if (!pt) return true;

  const { cx, cy: cy0, staffStep: staffStepFromAnchor, staffBounds: staffBoundsFromAnchor, locator } = anchor;
  const guessed = guessStaffBounds(args.svg, cx, cy0);
  const staffBounds = guessed ?? staffBoundsFromAnchor;
  const staffStep =
    staffBounds ? Math.max(0.5, ((staffBounds.bottom - staffBounds.top) / 4) / 2) : staffStepFromAnchor;
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(n)));
  const steps = clamp(-(pt.y - cy0) / staffStep, -48, 48);
  const y = cy0 - steps * staffStep;
  args.setDrawAnchor({ locator, steps, svg: args.svg });

  const existing = args.drawPreview;
  if (!existing || existing.svg !== args.svg) {
    if (existing) existing.g.parentNode?.removeChild(existing.g);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-hf-draw-preview', '1');
    args.svg.appendChild(g);
    args.setDrawPreview({ svg: args.svg, g });
  }
  const g = (args.drawPreview?.svg === args.svg ? args.drawPreview.g : (args.svg.querySelector('g[data-hf-draw-preview="1"]') as SVGGElement | null))
    ?? (args.setDrawPreview as any); // never used, but keeps TS happy for control flow
  const group = (args.drawPreview?.svg === args.svg ? args.drawPreview.g : null) ?? (args.svg.querySelector('g[data-hf-draw-preview="1"]') as SVGGElement | null);
  if (!group) return true;
  while (group.firstChild) group.removeChild(group.firstChild);
  const ns = 'http://www.w3.org/2000/svg';
  const headGroup = document.createElementNS(ns, 'g');
  headGroup.setAttribute('transform', `rotate(-25, ${cx}, ${y})`);
  const ell = document.createElementNS(ns, 'ellipse');
  ell.setAttribute('cx', String(cx));
  ell.setAttribute('cy', String(y));
  ell.setAttribute('rx', String(6.5));
  ell.setAttribute('ry', String(4.2));
  ell.setAttribute('fill', '#c00');
  headGroup.appendChild(ell);
  group.appendChild(headGroup);

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
  const halfWidth = 11;
  for (const ly of ys) {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', String(cx - halfWidth));
    line.setAttribute('x2', String(cx + halfWidth));
    line.setAttribute('y1', String(ly));
    line.setAttribute('y2', String(ly));
    line.setAttribute('stroke', '#c00');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-linecap', 'round');
    group.appendChild(line);
  }
  return true;
}

export function drawModeCancel(args: {
  drawPreview: { svg: SVGSVGElement; g: SVGGElement } | null;
  setDrawPreview: (v: { svg: SVGSVGElement; g: SVGGElement } | null) => void;
  setDrawAnchor: (v: { locator: NoteLocator; steps: number; svg: SVGSVGElement } | null) => void;
}): void {
  const prev = args.drawPreview;
  if (prev) prev.g.parentNode?.removeChild(prev.g);
  args.setDrawPreview(null);
  args.setDrawAnchor(null);
}

export function selectModePointerDown(args: {
  measureList: MeasureList;
  clientX: number;
  clientY: number;
  target: Node;
  pointerId: number;
  button: number;
  prevSelectedNote: GraphicNote | null;
  onSelect: (note: GraphicNote) => void;
}): NoteDragState | null {
  return noteDragPointerDown({
    measureList: args.measureList,
    clientX: args.clientX,
    clientY: args.clientY,
    fallbackTarget: args.target,
    pointerId: args.pointerId,
    button: args.button,
    prevSelectedNote: args.prevSelectedNote,
    onSelect: args.onSelect,
  });
}

export function selectModePointerMove(drag: NoteDragState, clientX: number, clientY: number, zoom: number): void {
  noteDragPointerMove(drag, clientX, clientY, zoom);
}

export function selectModePointerUp(args: {
  drag: NoteDragState;
  musicDoc: MusicXmlDocument | null;
  setPendingLocator: (loc: NoteLocator) => void;
  setDoc: (doc: MusicXmlDocument) => void;
}): void {
  noteDragPointerUp(args.drag, args.musicDoc, args.setPendingLocator, args.setDoc);
}

export function selectModeCancel(drag: NoteDragState): void {
  noteDragPointerCancel(drag);
}

