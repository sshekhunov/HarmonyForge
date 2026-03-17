/**
 * Note selection and highlighting helpers for OSMD graphic model.
 * Works with measure-first traversal to match MusicXML note order.
 */

import type { GraphicNote, MeasureList } from '../models/osmd';
import type { NoteLocator } from '../models/musicXml';

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

function getMeasureIndexFromSourceNote(sourceNote: unknown): number | null {
  const sm = (sourceNote as { SourceMeasure?: { measureListIndex?: number; MeasureListIndex?: number } })?.SourceMeasure;
  const idx = sm ? (sm.measureListIndex ?? sm.MeasureListIndex) : undefined;
  return typeof idx === 'number' && Number.isFinite(idx) ? idx : null;
}

function getStaffIdFromSourceNote(sourceNote: unknown): number | null {
  const staff = (sourceNote as { ParentStaff?: { Id?: number; idInMusicSheet?: number } })?.ParentStaff;
  const id = staff ? (staff.Id ?? staff.idInMusicSheet) : undefined;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

function toMusicXmlStaffNumber(osmdStaffId: number): number {
  // OSMD staff id is inconsistent across versions/scores:
  // sometimes 0-based within part (0,1), sometimes already 1-based (1,2).
  // We normalize to a MusicXML staff number (1+).
  return osmdStaffId >= 1 ? osmdStaffId : osmdStaffId + 1;
}

function getPartIdFromSourceNote(sourceNote: unknown): string | undefined {
  const inst = (sourceNote as { ParentStaff?: { ParentInstrument?: { IdString?: string; idString?: string } } })?.ParentStaff
    ?.ParentInstrument;
  const id = inst ? (inst.IdString ?? inst.idString) : undefined;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

function getVoiceIdFromSourceNote(sourceNote: unknown): string | undefined {
  const v = (sourceNote as { ParentVoiceEntry?: { ParentVoice?: { VoiceId?: number | string; voiceId?: number | string } } })
    ?.ParentVoiceEntry?.ParentVoice;
  const id = v ? (v.VoiceId ?? v.voiceId) : undefined;
  if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  if (typeof id === 'string' && id.length > 0) return id;
  return undefined;
}

export function getSelectedNoteLocator(
  measureList: MeasureList,
  selectedSourceNote: unknown
): NoteLocator | null {
  const measureIndex = getMeasureIndexFromSourceNote(selectedSourceNote);
  const staffId = getStaffIdFromSourceNote(selectedSourceNote);
  if (measureIndex === null || staffId === null) return null;
  const partId = getPartIdFromSourceNote(selectedSourceNote);
  const voice = getVoiceIdFromSourceNote(selectedSourceNote);

  let idx = 0;
  let found: number | null = null;
  const { iterateNotes } = getMeasureListGraph(measureList);
  iterateNotes((note) => {
    const sn = note.sourceNote as unknown;
    if (!sn || note.sourceNote?.isRest?.()) return;
    if (getMeasureIndexFromSourceNote(sn) !== measureIndex) return;
    if (getStaffIdFromSourceNote(sn) !== staffId) return;
    if (voice && getVoiceIdFromSourceNote(sn) !== voice) return;
    if (sn === selectedSourceNote) {
      found = idx;
      return;
    }
    idx++;
  });

  if (found === null) return null;
  return {
    partId,
    measureIndex,
    staffNumber: toMusicXmlStaffNumber(staffId),
    voice,
    indexInMeasure: found,
  };
}

export function highlightNoteByLocator(
  measureList: MeasureList,
  locator: NoteLocator,
  color: string
): GraphicNote | null {
  const targetMeasureIndex = locator.measureIndex;
  const staffCandidates = Array.from(new Set([locator.staffNumber, 1, 2].filter((n) => n >= 1)));

  const tryHighlight = (ignoreVoice: boolean): GraphicNote | null => {
    for (const staffNumber of staffCandidates) {
      let idx = 0;
      let highlighted: GraphicNote | null = null;
      const { iterateNotes } = getMeasureListGraph(measureList);
      iterateNotes((note) => {
        const sn = note.sourceNote as unknown;
        if (highlighted) return;
        if (!sn || note.sourceNote?.isRest?.()) return;
        if (getMeasureIndexFromSourceNote(sn) !== targetMeasureIndex) return;
        const staffId = getStaffIdFromSourceNote(sn);
        if (staffId === null) return;
        const noteStaffNumber = toMusicXmlStaffNumber(staffId);
        if (noteStaffNumber !== staffNumber) return;
        if (!ignoreVoice && locator.voice && getVoiceIdFromSourceNote(sn) !== locator.voice) return;
        if (idx === locator.indexInMeasure && note.sourceNote) {
          note.sourceNote.noteheadColor = color;
          highlighted = note;
          return;
        }
        idx++;
      });
      if (highlighted) return highlighted;
    }
    return null;
  };

  return tryHighlight(false) ?? tryHighlight(true);
}
