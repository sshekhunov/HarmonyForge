/**
 * Note selection and highlighting helpers for OSMD graphic model.
 * Works with measure-first traversal to match MusicXML note order.
 */

import type { GraphicNote, MeasureList } from '../models/osmd';
import type { NoteLocator } from '../models/musicXml';

/**
 * Normalizes OSMD's measure list into a simple traversal strategy so selection order
 * matches the MusicXML ordering used by locators.
 */
function getMeasureListGraph(measureList: MeasureList): {
  numArrays: number;
  numMeasures: number;
  iterateNotes: (callback: (note: GraphicNote) => void) => void;
} {
  const numArrays = measureList.length;
  const numMeasures = Math.max(
    0,
    ...measureList.map((arr) => (Array.isArray(arr) ? arr.length : 0))
  );
  const iterateNotes = (callback: (note: GraphicNote) => void) => {
    for (let measureIdx = 0; measureIdx < numMeasures; measureIdx++) {
      for (let arrayIdx = 0; arrayIdx < numArrays; arrayIdx++) {
        const measureArray = measureList[arrayIdx];
        if (!Array.isArray(measureArray)) continue;
        const measure = measureArray[measureIdx];
        if (!measure) continue;
        const m = measure as {
          staffEntries?: { graphicalVoiceEntries?: { notes?: unknown[] }[] }[];
        };
        for (const staffEntry of m.staffEntries ?? []) {
          for (const voiceEntry of staffEntry.graphicalVoiceEntries ?? []) {
            for (const note of voiceEntry.notes ?? []) {
              callback(note as GraphicNote);
            }
          }
        }
      }
    }
  };
  return { numArrays, numMeasures, iterateNotes };
}

/**
 * Builds a map from DOM elements (notehead SVGs) to the graphic notes they belong to.
 */
function buildElementToNotes(measureList: MeasureList): Map<Element, GraphicNote[]> {
  const map = new Map<Element, GraphicNote[]>();
  const { iterateNotes } = getMeasureListGraph(measureList);
  iterateNotes((note) => {
    const noteheads = note.getNoteheadSVGs?.();
    if (noteheads?.length) {
      for (const el of noteheads) {
        const list = map.get(el) ?? [];
        if (!list.includes(note)) list.push(note);
        map.set(el, list);
      }
    }
  });
  return map;
}

/**
 * Finds the graphic note at the given client coordinates.
 * For chords, picks the note whose notehead is closest to the click (by vertical position).
 */
function findNoteAtPoint(
  measureList: MeasureList,
  clientX: number,
  clientY: number
): GraphicNote | null {
  const elementToNotes = buildElementToNotes(measureList);
  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);

  for (const el of elementsAtPoint) {
    if (!elementToNotes.has(el)) continue;
    const notes = elementToNotes.get(el)!;
    if (notes.length === 1) return notes[0] ?? null;

    const chordNotes = notes;
    // OSMD can return chord noteheads as a shared array on each note.
    // If the array length matches the number of chord notes, we can map by index.
    const sharedHeads = chordNotes[0]?.getNoteheadSVGs?.() ?? [];
    if (sharedHeads.length === chordNotes.length) {
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < sharedHeads.length; i++) {
        const r = sharedHeads[i]?.getBoundingClientRect();
        if (!r) continue;
        const centerY = r.top + r.height / 2;
        const d = Math.abs(clientY - centerY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      return chordNotes[bestIdx] ?? chordNotes[0] ?? null;
    }

    // Fallback: estimate per note from its first notehead rect.
    const withRect = chordNotes
      .map((note) => {
        const head = note.getNoteheadSVGs?.()?.[0];
        const r = head?.getBoundingClientRect();
        return {
          note,
          centerY: r ? r.top + r.height / 2 : Number.NaN,
        };
      })
      .filter((x) => Number.isFinite(x.centerY));
    if (withRect.length === 0) return chordNotes[0] ?? null;
    let best = withRect[0]!;
    let bestDist = Math.abs(clientY - best.centerY);
    for (const cur of withRect.slice(1)) {
      const d = Math.abs(clientY - cur.centerY);
      if (d < bestDist) {
        best = cur;
        bestDist = d;
      }
    }
    return best.note ?? chordNotes[0] ?? null;
  }

  return null;
}

/**
 * Fallback: walk up from a DOM node to find a note element in the map.
 */
function findNoteFromNode(
  elementToNotes: Map<Element, GraphicNote[]>,
  startNode: Node
): GraphicNote | null {
  let node: Node | null = startNode;
  while (node && node !== document.body) {
    if (node instanceof Element && elementToNotes.has(node)) {
      const notes = elementToNotes.get(node)!;
      return notes.length === 1 ? notes[0] ?? null : notes[notes.length - 1] ?? notes[0] ?? null;
    }
    node = node instanceof Element ? node.parentElement : node.parentNode;
  }
  return null;
}

/**
 * Finds the graphic note at the given coordinates, with fallback to walking up from a DOM node.
 */
export function findClickedNote(
  measureList: MeasureList,
  clientX: number,
  clientY: number,
  fallbackTarget?: Node
): GraphicNote | null {
  const atPoint = findNoteAtPoint(measureList, clientX, clientY);
  if (atPoint) return atPoint;
  if (fallbackTarget) {
    const elementToNotes = buildElementToNotes(measureList);
    return findNoteFromNode(elementToNotes, fallbackTarget);
  }
  return null;
}

/**
 * Clears the highlight from a previously selected note.
 */
export function clearNoteHighlight(note: GraphicNote | null): void {
  if (note?.sourceNote && 'noteheadColor' in note.sourceNote) {
    delete note.sourceNote.noteheadColor;
  }
}

/**
 * Clears highlight from every note in the measure list so only one note can be selected at a time.
 */
export function clearAllNoteHighlights(measureList: MeasureList): void {
  const { iterateNotes } = getMeasureListGraph(measureList);
  iterateNotes((note) => clearNoteHighlight(note));
}

/**
 * Reads the 0-based measure index from an OSMD source note.
 */
function getMeasureIndexFromSourceNote(sourceNote: unknown): number | null {
  const sm = (sourceNote as { SourceMeasure?: { measureListIndex?: number; MeasureListIndex?: number } })?.SourceMeasure;
  const idx = sm ? (sm.measureListIndex ?? sm.MeasureListIndex) : undefined;
  return typeof idx === 'number' && Number.isFinite(idx) ? idx : null;
}

/**
 * Reads the staff id from an OSMD source note.
 */
function getStaffIdFromSourceNote(sourceNote: unknown): number | null {
  const staff = (sourceNote as { ParentStaff?: { Id?: number; idInMusicSheet?: number } })?.ParentStaff;
  const id = staff ? (staff.Id ?? staff.idInMusicSheet) : undefined;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

/**
 * Converts OSMD staff ids to MusicXML staff numbers (1-based).
 */
function toMusicXmlStaffNumber(osmdStaffId: number): number {
  // OSMD staff id is inconsistent across versions/scores:
  // sometimes 0-based within part (0,1), sometimes already 1-based (1,2).
  // We normalize to a MusicXML staff number (1+).
  return osmdStaffId >= 1 ? osmdStaffId : osmdStaffId + 1;
}

/**
 * Reads the MusicXML part id from an OSMD source note when available.
 */
function getPartIdFromSourceNote(sourceNote: unknown): string | undefined {
  const inst = (sourceNote as { ParentStaff?: { ParentInstrument?: { IdString?: string; idString?: string } } })?.ParentStaff
    ?.ParentInstrument;
  const id = inst ? (inst.IdString ?? inst.idString) : undefined;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

/**
 * Reads the voice identifier from an OSMD source note when available.
 */
function getVoiceIdFromSourceNote(sourceNote: unknown): string | undefined {
  const v = (sourceNote as { ParentVoiceEntry?: { ParentVoice?: { VoiceId?: number | string; voiceId?: number | string } } })
    ?.ParentVoiceEntry?.ParentVoice;
  const id = v ? (v.VoiceId ?? v.voiceId) : undefined;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string' && id.length > 0) return id;
  return undefined;
}

/** Builds a NoteLocator for the given OSMD source note by traversing the measure list in MusicXML order. */
export function getSelectedNoteLocator(
  measureList: MeasureList,
  selectedSourceNote: unknown
): NoteLocator | null {
  const measureIndex = getMeasureIndexFromSourceNote(selectedSourceNote);
  const staffId = getStaffIdFromSourceNote(selectedSourceNote);
  if (measureIndex === null || staffId === null) return null;
  const partId = getPartIdFromSourceNote(selectedSourceNote);
  const voice = getVoiceIdFromSourceNote(selectedSourceNote);
  const isRest = !!(selectedSourceNote as { isRest?: () => boolean })?.isRest?.();

  let pitchIdx = 0;
  let foundPitch: number | null = null;
  let eventIdx = 0;
  let foundEvent: number | null = null;
  const { iterateNotes } = getMeasureListGraph(measureList);
  iterateNotes((note) => {
    const sn = note.sourceNote as unknown;
    if (!sn) return;
    if (getMeasureIndexFromSourceNote(sn) !== measureIndex) return;
    if (getStaffIdFromSourceNote(sn) !== staffId) return;
    if (voice && getVoiceIdFromSourceNote(sn) !== voice) return;
    const curIsRest = !!note.sourceNote?.isRest?.();
    // Count events: rests and non-chord notes only (chord notes belong to previous event).
    const isChordNote = !curIsRest && ((sn as any)?.IsChord ?? (sn as any)?.isChord ?? false);
    if (!isChordNote) {
      if (sn === selectedSourceNote) foundEvent = eventIdx;
      eventIdx++;
    }

    if (curIsRest) return;
    if (sn === selectedSourceNote) {
      foundPitch = pitchIdx;
      return;
    }
    pitchIdx++;
  });

  if (isRest) {
    if (foundEvent === null) return null;
    return {
      partId,
      measureIndex,
      staffNumber: toMusicXmlStaffNumber(staffId),
      voice,
      target: 'rest',
      eventIndex: foundEvent,
      indexInMeasure: 0,
    };
  }
  if (foundPitch === null) return null;
  return {
    partId,
    measureIndex,
    staffNumber: toMusicXmlStaffNumber(staffId),
    voice,
    target: 'note',
    eventIndex: foundEvent ?? undefined,
    indexInMeasure: foundPitch,
  };
}

/** Finds the graphic note matching the locator and sets its noteheadColor; returns that note or null. */
export function highlightNoteByLocator(
  measureList: MeasureList,
  locator: NoteLocator,
  color: string
): GraphicNote | null {
  const targetMeasureIndex = locator.measureIndex;
  const staffCandidates = Array.from(new Set([locator.staffNumber, 1, 2].filter((n) => n >= 1)));

  const tryHighlight = (ignoreVoice: boolean): GraphicNote | null => {
    for (const staffNumber of staffCandidates) {
      let pitchIdx = 0;
      let eventIdx = 0;
      let highlighted: GraphicNote | null = null;
      const { iterateNotes } = getMeasureListGraph(measureList);
      iterateNotes((note) => {
        const sn = note.sourceNote as unknown;
        if (highlighted) return;
        if (!sn) return;
        if (getMeasureIndexFromSourceNote(sn) !== targetMeasureIndex) return;
        const staffId = getStaffIdFromSourceNote(sn);
        if (staffId === null) return;
        const noteStaffNumber = toMusicXmlStaffNumber(staffId);
        if (noteStaffNumber !== staffNumber) return;
        if (!ignoreVoice && locator.voice && getVoiceIdFromSourceNote(sn) !== locator.voice) return;
        const curIsRest = !!note.sourceNote?.isRest?.();
        const isChordNote = !curIsRest && ((sn as any)?.IsChord ?? (sn as any)?.isChord ?? false);
        if (!isChordNote) {
          if (locator.target === 'rest') {
            if (curIsRest && eventIdx === (locator.eventIndex ?? -1) && note.sourceNote) {
              note.sourceNote.noteheadColor = color;
              highlighted = note;
              return;
            }
          } else {
            // note target: use pitch index
          }
          eventIdx++;
        }

        if (!curIsRest) {
          if (locator.target !== 'rest' && pitchIdx === locator.indexInMeasure && note.sourceNote) {
            note.sourceNote.noteheadColor = color;
            highlighted = note;
            return;
          }
          pitchIdx++;
        }
      });
      if (highlighted) return highlighted;
    }
    return null;
  };

  return tryHighlight(false) ?? tryHighlight(true);
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  try {
    const ctm = svg.getScreenCTM?.();
    if (!ctm) return { x: clientX, y: clientY };
    const inv = ctm.inverse();
    if (typeof (globalThis as any).DOMPoint === 'function') {
      const p = new (globalThis as any).DOMPoint(clientX, clientY).matrixTransform(inv);
      return { x: p.x, y: p.y };
    }
    const pt = svg.createSVGPoint?.();
    if (!pt) return { x: clientX, y: clientY };
    pt.x = clientX;
    pt.y = clientY;
    const p2 = pt.matrixTransform(inv);
    return { x: p2.x, y: p2.y };
  } catch {
    return { x: clientX, y: clientY };
  }
}

export type DrawHoverAnchor = {
  note: GraphicNote;
  locator: NoteLocator;
  cx: number;
  cy: number;
  staffStep: number;
  staffBounds: { top: number; bottom: number };
  svg: SVGSVGElement;
  headBbox: { width: number; height: number } | null;
};

/**
 * Finds the nearest note/rest (beat) when the pointer is over a staff region (staff ± 5 ledger steps).
 * Uses staff hit-test then nearest-by-X to stick the draw preview to the correct beat.
 */
export function findNearestBeatOnStaff(
  measureList: MeasureList,
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): DrawHoverAnchor | null {
  const pt = clientToSvg(svg, clientX, clientY);
  const entries: Array<{
    note: GraphicNote;
    cx: number;
    cy: number;
    measureIndex: number;
    staffNumber: number;
  }> = [];
  const { iterateNotes } = getMeasureListGraph(measureList);
  iterateNotes((note) => {
    const head = note.getNoteheadSVGs?.()?.[0];
    const r = (head as SVGGraphicsElement | undefined)?.getBoundingClientRect?.();
    if (!r) return;
    const centerX = r.left + r.width / 2;
    const centerY = r.top + r.height / 2;
    const svgPt = clientToSvg(svg, centerX, centerY);
    const measureIndex = getMeasureIndexFromSourceNote(note.sourceNote);
    const staffId = getStaffIdFromSourceNote(note.sourceNote);
    if (measureIndex === null || staffId === null) return;
    const staffNumber = toMusicXmlStaffNumber(staffId);
    entries.push({
      note,
      cx: svgPt.x,
      cy: svgPt.y,
      measureIndex,
      staffNumber,
    });
  });
  if (entries.length === 0) return null;

  const LEDGER_EXTRA = 10;
  const computeStaffBoundsFromLines = (xRef: number, yRef: number): { top: number; bottom: number } | null => {
    const lineYs: number[] = [];
    const els = svg.querySelectorAll('path, line');
    for (const el of Array.from(els)) {
      const r = (el as SVGElement).getBoundingClientRect?.();
      if (!r) continue;
      if (r.width < 120) continue;
      if (r.height <= 0 || r.height > 3) continue;
      if (r.width / r.height < 40) continue;
      const yClient = r.top + r.height / 2;
      const leftSvg = clientToSvg(svg, r.left, yClient).x;
      const rightSvg = clientToSvg(svg, r.right, yClient).x;
      if (xRef < leftSvg - 5 || xRef > rightSvg + 5) continue;
      const ySvg = clientToSvg(svg, r.left + r.width / 2, yClient).y;
      if (!Number.isFinite(ySvg)) continue;
      lineYs.push(ySvg);
    }
    if (lineYs.length < 5) return null;
    lineYs.sort((a, b) => a - b);

    const unique: number[] = [];
    for (const y of lineYs) {
      const last = unique[unique.length - 1];
      if (typeof last === 'number' && Math.abs(y - last) < 0.25) continue;
      unique.push(y);
    }
    if (unique.length < 5) return null;

    type Staff = { top: number; bottom: number; score: number };
    const staffs: Staff[] = [];
    for (let i = 0; i + 4 < unique.length; i++) {
      const ys = unique.slice(i, i + 5);
      const d1 = ys[1]! - ys[0]!;
      const d2 = ys[2]! - ys[1]!;
      const d3 = ys[3]! - ys[2]!;
      const d4 = ys[4]! - ys[3]!;
      const avg = (d1 + d2 + d3 + d4) / 4;
      if (!Number.isFinite(avg) || avg <= 0) continue;
      const tol = Math.max(0.75, avg * 0.35);
      if (Math.abs(d1 - avg) > tol) continue;
      if (Math.abs(d2 - avg) > tol) continue;
      if (Math.abs(d3 - avg) > tol) continue;
      if (Math.abs(d4 - avg) > tol) continue;
      const top = ys[0]!;
      const bottom = ys[4]!;
      const score = Math.abs(yRef - (top + bottom) / 2);
      staffs.push({ top, bottom, score });
    }
    if (staffs.length === 0) return null;
    staffs.sort((a, b) => a.score - b.score);
    const best = staffs[0]!;
    return { top: best.top, bottom: best.bottom };
  };

  let nearestX = entries[0]!;
  let bestDx0 = Math.abs(nearestX.cx - pt.x);
  for (const e of entries.slice(1)) {
    const d = Math.abs(e.cx - pt.x);
    if (d < bestDx0) {
      bestDx0 = d;
      nearestX = e;
    }
  }

  const staffBounds = computeStaffBoundsFromLines(pt.x, pt.y)
    ?? computeStaffBoundsFromLines(nearestX.cx, pt.y)
    ?? (() => {
    let bestEntry = entries[0]!;
    let bestDy = Math.abs(bestEntry.cy - pt.y);
    for (const e of entries.slice(1)) {
      const d = Math.abs(e.cy - pt.y);
      if (d < bestDy) {
        bestDy = d;
        bestEntry = e;
      }
    }
    const head = bestEntry.note.getNoteheadSVGs?.()?.[0] as SVGGraphicsElement | undefined;
    const bbox = head?.getBBox?.() ?? null;
    const step = Math.max(0.5, Math.min(50, bbox ? bbox.height / 2 : 3));
    return { top: bestEntry.cy - 4 * step, bottom: bestEntry.cy + 4 * step };
  })();

  const staffStep = Math.max(0.5, ((staffBounds.bottom - staffBounds.top) / 4) / 2);
  const yMin = staffBounds.top - LEDGER_EXTRA * staffStep;
  const yMax = staffBounds.bottom + LEDGER_EXTRA * staffStep;
  if (pt.y < yMin || pt.y > yMax) return null;
  const filtered = entries.filter((e) => e.cy >= yMin && e.cy <= yMax);
  if (filtered.length === 0) return null;

  let best = filtered[0]!;
  let bestDx = Math.abs(best.cx - pt.x);
  for (const e of filtered.slice(1)) {
    const d = Math.abs(e.cx - pt.x);
    if (d < bestDx) {
      bestDx = d;
      best = e;
    }
  }
  const locator = getSelectedNoteLocator(measureList, best.note.sourceNote);
  if (!locator) return null;
  const head = best.note.getNoteheadSVGs?.()?.[0] as SVGGraphicsElement | undefined;
  const headBbox = head?.getBBox?.() ?? null;
  return {
    note: best.note,
    locator,
    cx: best.cx,
    cy: best.cy,
    staffStep,
    staffBounds,
    svg,
    headBbox: headBbox ? { width: headBbox.width, height: headBbox.height } : null,
  };
}
