import type { GraphicNote, MeasureList } from '../models/osmd';
import type { MusicXmlDocument } from '../models/musicXmlDocument';
import type { NoteLocator } from '../models/musicXml';
import { clearNoteHighlight, findClickedNote, findNearestBeatOnStaff, getSelectedNoteLocator } from './noteSelection';
import { eraseNoteAtLocator } from './noteEraseHelpers';
import { addNoteAtHoveredBeat } from './noteDrawHelpers';
import { noteDragPointerCancel, noteDragPointerDown, noteDragPointerMove, noteDragPointerUp, type NoteDragState } from './noteDragHelpers';
import {
  clientToSvg,
  guessStaffBounds,
  staffStepFromBounds,
  computeLedgerLineYs,
  drawLedgerLines,
} from './staffLedgerHelpers';

export type DurationValue = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th';
export type DotValue = 0 | 1 | 2;

type ApplyDocChange = (doc: MusicXmlDocument | null) => void;

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
    staffBounds ? staffStepFromBounds(staffBounds.top, staffBounds.bottom) : staffStepFromAnchor;
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
  const ys = computeLedgerLineYs(topY, bottomY, y, staffStep);
  const ledgerG = document.createElementNS(ns, 'g');
  group.appendChild(ledgerG);
  drawLedgerLines(ledgerG, cx, 11, ys, '#c00');
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

