import type { MusicXmlDocument, MusicXmlPitch } from '../models/musicXmlDocument';
import type { NoteLocator } from '../models/musicXml';
import { getIndexedPart } from './musicXmlHelper';
import type { GraphicNote } from '../models/osmd';
import { clearAccidental } from './accidentalHelpers';
import { clearAllNoteHighlights, findClickedNote, getSelectedNoteLocator } from './noteSelection';
import type { MeasureList } from '../models/osmd';
import {
  clientToSvg,
  guessStaffBounds,
  staffStepFromBounds,
  computeLedgerLineYs,
  drawLedgerLines as drawLedgerLinesIntoGroup,
} from './staffLedgerHelpers';

const STEPS: Array<MusicXmlPitch['step']> = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const STEP_TO_SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Type guard: true if the string is a valid MusicXML pitch step (C–B). */
function isStep(s: string): s is MusicXmlPitch['step'] {
  return STEPS.includes(s as any);
}

/** Clamps a value to an integer in [min, max]; invalid numbers yield min. */
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
  const raw = -deltaYPx / step;
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

/** Converts a MusicXML pitch to a MIDI-like number for ordering; returns NaN if step is invalid. */
function pitchToMidi(p: MusicXmlPitch): number {
  const step = (p.step ?? '').toUpperCase();
  if (!(step in STEP_TO_SEMITONE)) return Number.NaN;
  const base = STEP_TO_SEMITONE[step]!;
  const alter = typeof p.alter === 'number' && Number.isFinite(p.alter) ? p.alter : 0;
  const octave = typeof p.octave === 'number' && Number.isFinite(p.octave) ? p.octave : 0;
  return (octave + 1) * 12 + base + alter;
}

/** Returns pitchToMidi(p) or a large tiebreak value so invalid pitches sort stably. */
function safeMidi(p: MusicXmlPitch, tiebreak: number): number {
  const m = pitchToMidi(p);
  return Number.isFinite(m) ? m : 1_000_000 + tiebreak;
}

/** True if the note matches the locator’s staff and (when set) voice. */
function matchesStaffVoice(note: { staff: number; voice?: string }, locator: NoteLocator): boolean {
  if (note.staff !== locator.staffNumber) return false;
  if (locator.voice && note.voice && note.voice !== locator.voice) return false;
  return true;
}

/** Finds the measure element index and part index for the note at locator.indexInMeasure (staff/voice filtered). */
function locatePitchedElementIndex(
  doc: MusicXmlDocument,
  locator: NoteLocator
): { partIndex: number; measureIndex: number; elementIndex: number } | null {
  const part = getIndexedPart(doc, locator.partId);
  if (!part) return null;
  const partIndex = doc.parts.indexOf(part);
  const measure = part.measures[locator.measureIndex];
  if (!measure) return null;
  let pitchIndex = 0;
  for (let i = 0; i < measure.elements.length; i++) {
    const el = measure.elements[i] as any;
    if (el?.kind !== 'note') continue;
    if (!matchesStaffVoice(el, locator)) continue;
    if (!el.pitch) continue;
    if (pitchIndex === locator.indexInMeasure) return { partIndex, measureIndex: locator.measureIndex, elementIndex: i };
    pitchIndex++;
  }
  return null;
}

/** Returns the pitch index (indexInMeasure) for the given element index after chord notes are ordered by pitch. */
function recomputeIndexInMeasureForElement(doc: MusicXmlDocument, locator: NoteLocator, elementIndex: number): number | null {
  const part = getIndexedPart(doc, locator.partId);
  if (!part) return null;
  const measure = part.measures[locator.measureIndex];
  if (!measure) return null;

  type NoteWithIdx = { elementIndex: number; pitch: MusicXmlPitch };
  const ordered: NoteWithIdx[] = [];
  let currentChord: NoteWithIdx[] = [];

  const flushChord = () => {
    if (!currentChord.length) return;
    currentChord.sort((a, b) => safeMidi(a.pitch, a.elementIndex) - safeMidi(b.pitch, b.elementIndex));
    ordered.push(...currentChord);
    currentChord = [];
  };

  for (let i = 0; i < measure.elements.length; i++) {
    const el = measure.elements[i] as any;
    if (el?.kind !== 'note') continue;
    if (!matchesStaffVoice(el, locator)) continue;
    if (!el.pitch) continue;
    if (!el.chord) flushChord();
    currentChord.push({ elementIndex: i, pitch: el.pitch as MusicXmlPitch });
  }
  flushChord();

  let idxInMeasure = 0;
  for (const n of ordered) {
    if (n.elementIndex === elementIndex) return idxInMeasure;
    idxInMeasure++;
  }
  return null;
}

/** Applies pitch drag, then reorders the chord by pitch and returns the doc and new element index for the moved note. */
function applyPitchDragWithChordReorder(
  current: MusicXmlDocument,
  locator: NoteLocator,
  diatonicSteps: number
): { doc: MusicXmlDocument; elementIndex: number } | null {
  const loc = locatePitchedElementIndex(current, locator);
  if (!loc) return null;
  const next0 = applyPitchDragDiatonic(current, locator, diatonicSteps);
  if (!next0) return null;

  const doc = structuredClone(next0) as MusicXmlDocument;
  const part = getIndexedPart(doc, locator.partId);
  const measure = part?.measures[locator.measureIndex];
  if (!part || !measure) return { doc: next0, elementIndex: loc.elementIndex };

  const start = (() => {
    let i = loc.elementIndex;
    while (i > 0) {
      const prev = measure.elements[i - 1] as any;
      if (prev?.kind !== 'note') break;
      if (!matchesStaffVoice(prev, locator)) break;
      if (!prev.pitch) break;
      if (!prev.chord) break;
      i--;
    }
    return i;
  })();
  const end = (() => {
    let i = loc.elementIndex;
    while (i + 1 < measure.elements.length) {
      const next = measure.elements[i + 1] as any;
      if (next?.kind !== 'note') break;
      if (!matchesStaffVoice(next, locator)) break;
      if (!next.pitch) break;
      if (!next.chord) break;
      i++;
    }
    return i;
  })();

  if (end <= start) {
    return { doc: doc, elementIndex: loc.elementIndex };
  }

  const slice = measure.elements.slice(start, end + 1) as any[];
  const wrapped = slice.map((el, idx) => ({
    el,
    oldAbsIndex: start + idx,
    midi: el?.pitch ? safeMidi(el.pitch as MusicXmlPitch, start + idx) : 1_000_000 + (start + idx),
  }));
  wrapped.sort((a, b) => a.midi - b.midi);
  const sortedEls = wrapped.map((w, idx) => {
    const e = w.el;
    return { ...e, chord: idx === 0 ? false : true };
  });

  measure.elements.splice(start, end - start + 1, ...sortedEls);

  const newElementIndex = start + wrapped.findIndex((w) => w.oldAbsIndex === loc.elementIndex);
  return { doc, elementIndex: newElementIndex >= start ? newElementIndex : loc.elementIndex };
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
  startClientX: number;
  startClientY: number;
  lastClientX: number;
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
  svgEl: SVGSVGElement | null;
};

/** Removes transform and transition styles from the dragged notehead elements. */
function clearDragPreview(els: Element[]) {
  for (const el of els) {
    const html = el as HTMLElement;
    html.style.transform = '';
    html.style.transformOrigin = '';
    html.style.willChange = '';
    html.style.transition = '';
  }
}

/** Applies a vertical translateY (px) to the given elements for drag preview. */
function applyDragPreview(els: Element[], yPx: number) {
  for (const el of els) {
    const html = el as HTMLElement;
    html.style.willChange = 'transform';
    html.style.transformOrigin = 'center';
    html.style.transform = `translateY(${yPx}px)`;
  }
}

/** Sets fill and stroke to the given color on the elements and their path/ellipse/circle/rect children. */
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

/** For a chord note, returns only the single notehead element for that note; otherwise returns all noteheads. */
function getSingleNoteheadElements(note: GraphicNote): Element[] {
  const heads = (note.getNoteheadSVGs?.() ?? []).filter(Boolean) as Element[];
  if (heads.length <= 1) return heads;
  const chordNotes = (note.parentVoiceEntry?.notes ?? []) as unknown as GraphicNote[];
  if (Array.isArray(chordNotes) && chordNotes.length > 1 && heads.length === chordNotes.length) {
    const idx = chordNotes.indexOf(note);
    if (idx >= 0) {
      const head = heads[idx];
      return head ? [head] : heads;
    }
  }

  // Fallback: if chord mapping isn't available, use the first head only (best effort).
  return heads[0] ? [heads[0]] : heads;
}

/** Walks up from the element to the nearest ancestor SVGSVGElement. */
function getClosestSvg(el: Element | null): SVGSVGElement | null {
  let cur: Element | null = el;
  while (cur) {
    if (cur instanceof SVGSVGElement) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/** Estimates one diatonic staff step in SVG units from the notehead’s bounding box height. */
function estimateStaffStepSvgFromNotehead(notehead: Element | null): number {
  const g = notehead as unknown as SVGGraphicsElement | null;
  const r = g?.getBBox?.();
  const est = r ? r.height / 2 : 3;
  return Math.max(0.5, Math.min(50, est));
}

/** Approximates SVG units per screen pixel (Y) from the SVG’s screen CTM inverse. */
function estimateSvgUnitsPerPx(svgEl: SVGSVGElement): number {
  const ctm = svgEl.getScreenCTM?.();
  if (!ctm) return 1;
  const inv = ctm.inverse();
  const v = inv.d;
  return Number.isFinite(v) && v !== 0 ? v : 1;
}

/** Creates and appends a ledger-line group to the SVG; reuses existing one if present. */
function ensureLedgerGroup(svg: SVGSVGElement): SVGGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('data-hf-ledgers', '1');
  svg.appendChild(g);
  return g;
}

/** Removes all child elements from the ledger group. */
function clearLedgerLines(group: SVGGElement | null) {
  if (!group) return;
  while (group.firstChild) group.removeChild(group.firstChild);
}

/** Removes the ledger group from its parent. */
function removeLedgerGroup(group: SVGGElement | null) {
  if (!group) return;
  group.parentNode?.removeChild(group);
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

/** Handles pointer down: resolves clicked note, builds drag state (staff/ledger/SVG refs), and returns it or null. */
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

  clearAllNoteHighlights(args.measureList);
  clickedNote.sourceNote.noteheadColor = '#c00';
  const color = clickedNote.sourceNote.noteheadColor ?? '#c00';
  args.onSelect(clickedNote);

  const noteheadEls = getSingleNoteheadElements(clickedNote);
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
      ? staffStepFromBounds(staffTopY, staffBottomY)
      : estimateStaffStepSvgFromNotehead(firstHead);
  const staffStepPx = Math.max(1, Math.min(80, staffStepSvg / (svgUnitsPerPx || 1)));
  const ledgerGroup = svg ? ensureLedgerGroup(svg) : null;

  return {
    active: true,
    moved: false,
    pointerId: args.pointerId,
    startClientX: args.clientX,
    startClientY: args.clientY,
    lastClientX: args.clientX,
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
    svgEl: svg ?? null,
  };
}

/** Updates drag preview (translateY, ledger lines) from current pointer position and zoom. */
export function noteDragPointerMove(
  drag: NoteDragState,
  clientX: number,
  clientY: number,
  zoom: number
): void {
  if (!drag.active) return;
  const dy = clientY - drag.startClientY;
  drag.lastClientX = clientX;
  drag.lastClientY = clientY;
  if (Math.abs(dy) >= 3) drag.moved = true;

  const diatonicSteps = (() => {
    const svg = drag.svgEl;
    if (!svg) return diatonicStepsFromDragDelta(dy, drag.staffStepPx);
    const cur = clientToSvg(svg, clientX, clientY);
    if (!cur) return diatonicStepsFromDragDelta(dy, drag.staffStepPx);
    const deltaSvgY = cur.y - drag.noteCenterYSvg;
    return clampInt(-deltaSvgY / (drag.staffStepSvg || 1), -48, 48);
  })();
  const z = typeof zoom === 'number' && Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const snappedDyScreenPx = (-diatonicSteps * drag.staffStepSvg) / (drag.svgUnitsPerPx || 1);
  const snappedDyLocalPx = snappedDyScreenPx / z;
  applyDragPreview(drag.noteheadEls, snappedDyLocalPx);

  const projectedCenterYSvg = drag.noteCenterYSvg + (-diatonicSteps * drag.staffStepSvg);
  const ys = computeLedgerLineYs(
    drag.staffTopY,
    drag.staffBottomY,
    projectedCenterYSvg,
    drag.staffStepSvg
  );
  if (drag.ledgerGroup) {
    const headBox = (drag.noteheadEls[0] as unknown as SVGGraphicsElement | null)?.getBBox?.() ?? null;
    const halfWidth = headBox ? Math.max(5, headBox.width * 0.7) : 10;
    drawLedgerLinesIntoGroup(drag.ledgerGroup, drag.noteCenterX, halfWidth, ys, drag.color);
  }
}

/** Cleans up drag state: clears preview transform and ledger group, marks drag inactive. */
export function noteDragPointerCancel(
  drag: NoteDragState,
): void {
  drag.active = false;
  clearDragPreview(drag.noteheadEls);
  clearLedgerLines(drag.ledgerGroup);
  removeLedgerGroup(drag.ledgerGroup);
  drag.ledgerGroup = null;
}

/** On pointer up: applies pitch change with chord reorder, recomputes indexInMeasure, sets pending locator and doc. */
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

  const applied = applyPitchDragWithChordReorder(currentDoc, drag.locator, diatonicSteps);
  if (!applied) return;
  const nextIndex = recomputeIndexInMeasureForElement(applied.doc, drag.locator, applied.elementIndex);
  const nextLocator =
    typeof nextIndex === 'number' ? { ...drag.locator, indexInMeasure: nextIndex } : drag.locator;
  setPendingLocator(nextLocator);
  setDoc(applied.doc);
}

