import type { MusicXmlDocument, MusicXmlMeasureElement, MusicXmlNote } from '../models/musicXmlDocument';
import type { NoteLocator } from '../models/musicXml';
import { getIndexedPart } from './musicXmlHelper';

/** Returns true if the note matches the locator’s staff and (when set) voice. */
function matchesStaffVoice(note: { staff: number; voice?: string }, locator: NoteLocator): boolean {
  if (note.staff !== locator.staffNumber) return false;
  if (locator.voice && note.voice && note.voice !== locator.voice) return false;
  return true;
}

/** Locates the pitched MusicXmlNote in the measure for locator.indexInMeasure and returns its element index. */
function locatePitchElementIndex(elements: MusicXmlMeasureElement[], locator: NoteLocator): number | null {
  let pitchIndex = 0;
  for (let i = 0; i < elements.length; i++) {
    const e = elements[i]!;
    if (e.kind !== 'note') continue;
    if (!matchesStaffVoice(e, locator)) continue;
    if (!e.pitch) continue;
    if (pitchIndex === locator.indexInMeasure) return i;
    pitchIndex++;
  }
  return null;
}

/** Converts a non-chord note into a rest, preserving duration-related fields. */
function convertToRest(note: MusicXmlNote): MusicXmlNote {
  return {
    ...note,
    chord: false,
    pitch: undefined,
    accidental: undefined,
    ties: [],
  };
}

/** Erases a note: single notes become rests, chord notes are removed and chord root is promoted if needed. */
export function eraseNoteAtLocator(current: MusicXmlDocument, locator: NoteLocator): MusicXmlDocument | null {
  const doc = structuredClone(current);
  const part = getIndexedPart(doc, locator.partId);
  const measure = part?.measures[locator.measureIndex];
  if (!part || !measure) return null;

  const idx = locatePitchElementIndex(measure.elements, locator);
  if (idx === null) return null;
  const el = measure.elements[idx];
  if (!el || el.kind !== 'note' || !el.pitch) return null;

  const isChordNote = !!el.chord;

  if (!isChordNote) {
    const next = measure.elements[idx + 1] as any;
    const nextIsChordTail =
      next?.kind === 'note' && next.pitch && matchesStaffVoice(next, locator) && !!next.chord;
    if (!nextIsChordTail) {
      measure.elements[idx] = convertToRest(el);
      return doc;
    }
  }

  measure.elements.splice(idx, 1);

  if (!isChordNote) {
    const next = measure.elements[idx] as any;
    if (next?.kind === 'note' && next.pitch && matchesStaffVoice(next, locator) && !!next.chord) {
      next.chord = false;
    }
  }

  return doc;
}

