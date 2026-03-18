import type { NoteLocator } from '../models/musicXml';
import type { MusicXmlDocument } from '../models/musicXmlDocument';
import type { MusicXmlMeasureElement, MusicXmlNote } from '../models/musicXmlDocument';
import { getIndexedPart } from './musicXmlHelper';

function matchesStaffVoice(note: { staff: number; voice?: string }, locator: NoteLocator): boolean {
  if (note.staff !== locator.staffNumber) return false;
  if (locator.voice && note.voice && note.voice !== locator.voice) return false;
  return true;
}

function getActiveKeyFifths(doc: MusicXmlDocument, partId: string | undefined, measureIndex: number): number {
  const part = getIndexedPart(doc, partId);
  if (!part) return 0;
  let fifths = 0;
  for (let mi = 0; mi <= measureIndex; mi++) {
    const measure = part.measures[mi];
    if (!measure) continue;
    for (const e of measure.elements) {
      if (e.kind !== 'attributes') continue;
      if (typeof e.keyFifths === 'number' && Number.isFinite(e.keyFifths)) fifths = e.keyFifths;
    }
  }
  return fifths;
}

function keyAlterForStep(step: string, fifths: number): number {
  const sharps = ['F', 'C', 'G', 'D', 'A', 'E', 'B'] as const;
  const flats = ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const;
  const up = step.toUpperCase();
  if (fifths > 0) return sharps.slice(0, Math.min(7, fifths)).includes(up as any) ? 1 : 0;
  if (fifths < 0) return flats.slice(0, Math.min(7, -fifths)).includes(up as any) ? -1 : 0;
  return 0;
}

function locatePitchNoteInMeasure(elements: MusicXmlMeasureElement[], locator: NoteLocator): MusicXmlNote | null {
  let pitchIndex = 0;
  for (const e of elements) {
    if (e.kind !== 'note') continue;
    if (!matchesStaffVoice(e, locator)) continue;
    if (!e.pitch) continue;
    if (pitchIndex === locator.indexInMeasure) return e;
    pitchIndex++;
  }
  return null;
}

/**
 * Applies an explicit accidental to the selected pitch note.
 */
export function applyAccidental(
  current: MusicXmlDocument,
  locator: NoteLocator,
  alter: number,
  accidentalName: string
): MusicXmlDocument | null {
  const doc = structuredClone(current);
  const part = getIndexedPart(doc, locator.partId);
  const measure = part?.measures[locator.measureIndex];
  if (!part || !measure) return null;

  const note = locatePitchNoteInMeasure(measure.elements, locator);
  if (!note || !note.pitch) return null;
  note.pitch.alter = alter;
  note.accidental = accidentalName;
  return doc;
}

/**
 * Clears the explicit accidental and restores the pitch alteration implied by the key signature.
 */
export function clearAccidental(current: MusicXmlDocument, locator: NoteLocator): MusicXmlDocument | null {
  const doc = structuredClone(current);
  const part = getIndexedPart(doc, locator.partId);
  const measure = part?.measures[locator.measureIndex];
  if (!part || !measure) return null;

  const note = locatePitchNoteInMeasure(measure.elements, locator);
  if (!note || !note.pitch) return null;

  const fifths = getActiveKeyFifths(doc, locator.partId, locator.measureIndex);
  const keyAlter = note.pitch.step ? keyAlterForStep(note.pitch.step, fifths) : 0;
  if (keyAlter === 0) delete note.pitch.alter;
  else note.pitch.alter = keyAlter;
  delete note.accidental;
  return doc;
}
