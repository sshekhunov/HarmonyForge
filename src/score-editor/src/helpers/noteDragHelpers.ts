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
  // Typical notehead height ~ line spacing. Diatonic step ~= half that.
  const est = r ? r.height / 2 : 6;
  return Math.max(2, Math.min(40, est));
}

/**
 * Converts a vertical drag delta into diatonic steps (up is positive).
 */
export function diatonicStepsFromDragDelta(deltaYPx: number, staffStepPx: number): number {
  const step = staffStepPx > 0 ? staffStepPx : 6;
  // In screen coords, up is negative deltaY.
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
  note: GraphicNote;
  locator: NoteLocator;
  noteheadEls: Element[];
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
  const px = Math.round(yPx);
  for (const el of els) {
    const html = el as HTMLElement;
    html.style.willChange = 'transform';
    html.style.transformOrigin = 'center';
    html.style.transform = `translateY(${px}px)`;
  }
}

export type NoteDragStartArgs = {
  measureList: MeasureList;
  clientX: number;
  clientY: number;
  fallbackTarget?: Node;
  pointerId: number;
  button: number;
  /** For clearing previously selected note highlight. */
  prevSelectedNote: GraphicNote | null;
  /** Callback to update selection + re-render OSMD. */
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
  args.onSelect(clickedNote);

  const noteheadEls = (clickedNote.getNoteheadSVGs?.() ?? []).filter(Boolean) as Element[];
  const staffStepPx = estimateStaffStepPx(clickedNote);

  return {
    active: true,
    moved: false,
    pointerId: args.pointerId,
    startClientY: args.clientY,
    lastClientY: args.clientY,
    staffStepPx,
    note: clickedNote,
    locator,
    noteheadEls,
  };
}

export function noteDragPointerMove(drag: NoteDragState, clientY: number): void {
  if (!drag.active) return;
  const dy = clientY - drag.startClientY;
  drag.lastClientY = clientY;
  if (Math.abs(dy) >= 3) drag.moved = true;

  const diatonicSteps = diatonicStepsFromDragDelta(dy, drag.staffStepPx);
  const snappedDy = -diatonicSteps * drag.staffStepPx;
  applyDragPreview(drag.noteheadEls, snappedDy);
}

export function noteDragPointerCancel(drag: NoteDragState): void {
  drag.active = false;
  clearDragPreview(drag.noteheadEls);
}

export function noteDragPointerUp(
  drag: NoteDragState,
  currentDoc: MusicXmlDocument | null,
  setPendingLocator: (locator: NoteLocator) => void,
  setDoc: (doc: MusicXmlDocument) => void
): void {
  drag.active = false;
  clearDragPreview(drag.noteheadEls);

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

