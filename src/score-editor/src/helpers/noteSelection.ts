/**
 * Note selection and highlighting helpers for OSMD graphic model.
 * Works with measure-first traversal to match MusicXML note order.
 */

export interface GraphicNote {
  sourceNote?: {
    noteheadColor?: string;
    isRest?: () => boolean;
  };
  getNoteheadSVGs?: () => HTMLElement[];
  parentVoiceEntry?: { notes?: unknown[] };
}

export type MeasureList = unknown[][];

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
export function buildElementToNotes(measureList: MeasureList): Map<Element, GraphicNote[]> {
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
export function findNoteAtPoint(
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
    const withRect = chordNotes
      .map((note) => {
        const el = note.getNoteheadSVGs?.()?.[0];
        const r = el?.getBoundingClientRect();
        return {
          note,
          top: r?.top ?? 0,
          height: r?.height ?? 0,
          centerY: r ? r.top + r.height / 2 : 0,
        };
      })
      .filter((x) => x.height > 0);
    if (withRect.length === 0) return chordNotes[0] ?? null;

    const sortedByTop = [...withRect].sort((a, b) => a.top - b.top);
    const chordTop = Math.min(...sortedByTop.map((x) => x.top));
    const chordBottom = Math.max(...sortedByTop.map((x) => x.top + x.height));
    const chordHeight = chordBottom - chordTop;
    const relY = clientY - chordTop;
    let index = Math.min(
      sortedByTop.length - 1,
      Math.max(0, Math.floor((relY / (chordHeight || 1)) * sortedByTop.length))
    );
    const firstTop = sortedByTop[0]?.top;
    const allSameTop =
      firstTop !== undefined && sortedByTop.every((x) => x.top === firstTop);
    if (allSameTop) index = sortedByTop.length - 1 - index;
    return sortedByTop[index]?.note ?? chordNotes[0] ?? null;
  }

  return null;
}

/**
 * Fallback: walk up from a DOM node to find a note element in the map.
 */
export function findNoteFromNode(
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
 * Returns the pitch-note index (measure-first order) of the given source note, or null if not found.
 */
export function getSelectedNoteIndex(
  measureList: MeasureList,
  selectedSourceNote: { isRest?: () => boolean } | null | undefined
): number | null {
  if (!selectedSourceNote) return null;
  let index = 0;
  let found: number | null = null;
  const { iterateNotes } = getMeasureListGraph(measureList);
  iterateNotes((note) => {
    if (note.sourceNote === selectedSourceNote) {
      found = index;
      return;
    }
    if (note.sourceNote && !note.sourceNote.isRest?.()) index++;
  });
  return found;
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
 * Applies highlight color to the note at the given pitch-note index (measure-first).
 * Returns the note that was highlighted, or null.
 */
export function highlightNoteAtIndex(
  measureList: MeasureList,
  noteIndex: number,
  color: string
): GraphicNote | null {
  let idx = 0;
  let highlighted: GraphicNote | null = null;
  const { iterateNotes } = getMeasureListGraph(measureList);
  iterateNotes((note) => {
    if (note.sourceNote?.isRest?.()) return;
    if (idx === noteIndex && note.sourceNote) {
      note.sourceNote.noteheadColor = color;
      highlighted = note;
    }
    idx++;
  });
  return highlighted;
}
