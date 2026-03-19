import type { MusicXmlDocument, MusicXmlNote, MusicXmlPitch } from '../models/musicXmlDocument';
import type { NoteLocator } from '../models/musicXml';
import { extractVoiceEvents, getActiveDivisionsForMeasure, getIndexedPart } from './musicXmlHelper';
import { transposePitchDiatonic } from './noteDragHelpers';
import { clearAccidental, pitchWithoutAccidental } from './accidentalHelpers';

type DurationValue = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd' | '64th';

const TYPE_BY_ID: Record<DurationValue, string> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': '16th',
  '32nd': '32nd',
  '64th': '64th',
};

function durationInDivisions(divisions: number, id: DurationValue): number {
  const q = Math.max(1, divisions);
  const raw =
    id === 'whole'
      ? 4 * q
      : id === 'half'
        ? 2 * q
        : id === 'quarter'
          ? 1 * q
          : id === 'eighth'
            ? q / 2
            : id === '16th'
              ? q / 4
              : id === '32nd'
                ? q / 8
                : q / 16;
  return Math.max(1, Math.round(raw));
}

function dotMultiplier(dotCount: 0 | 1 | 2): number {
  return dotCount === 1 ? 1.5 : dotCount === 2 ? 1.75 : 1;
}

function getPitchAtLocator(doc: MusicXmlDocument, locator: NoteLocator): MusicXmlPitch | null {
  const part = getIndexedPart(doc, locator.partId);
  const measure = part?.measures[locator.measureIndex];
  if (!part || !measure) return null;
  let pitchIndex = 0;
  for (const el of measure.elements) {
    if (el.kind !== 'note') continue;
    if (el.staff !== locator.staffNumber) continue;
    if (locator.voice && el.voice && el.voice !== locator.voice) continue;
    if (!el.pitch) continue;
    if (pitchIndex === locator.indexInMeasure) return el.pitch;
    pitchIndex++;
  }
  return null;
}

function defaultPitchForStaff(staffNumber: number): MusicXmlPitch {
  return staffNumber >= 2 ? { step: 'C', octave: 3 } : { step: 'C', octave: 4 };
}

function makeNote(
  base: MusicXmlNote | null,
  staff: number,
  voice: string | undefined,
  pitch: MusicXmlPitch,
  duration: number,
  type: string,
  dots: 0 | 1 | 2,
  chord: boolean
): MusicXmlNote {
  const rawXml = base?.rawXml ?? '';
  const ties = chord ? [] : (base?.ties ?? []);
  return {
    kind: 'note',
    rawXml,
    staff,
    voice,
    chord,
    duration,
    type,
    dots,
    pitch,
    accidental: undefined,
    ties,
  };
}

export function addNoteAtHoveredBeat(
  current: MusicXmlDocument,
  anchorLocator: NoteLocator,
  pitchSteps: number,
  durationId: DurationValue,
  dotCount: 0 | 1 | 2
): { doc: MusicXmlDocument; pendingLocator: NoteLocator } | null {
  const doc = structuredClone(current);
  const part = getIndexedPart(doc, anchorLocator.partId);
  const measure = part?.measures[anchorLocator.measureIndex];
  if (!part || !measure) return null;

  const divisions = getActiveDivisionsForMeasure(part.measures, anchorLocator.measureIndex);
  const dur = Math.max(1, Math.round(durationInDivisions(divisions, durationId) * dotMultiplier(dotCount)));
  const type = TYPE_BY_ID[durationId];

  const extracted = extractVoiceEvents(measure, part.measures, anchorLocator);
  const ev = extracted.selectedEvent;
  if (!ev) return null;

  const basePitch =
    anchorLocator.target === 'note'
      ? (getPitchAtLocator(doc, anchorLocator) ?? defaultPitchForStaff(anchorLocator.staffNumber))
      : defaultPitchForStaff(anchorLocator.staffNumber);
  const transposed = transposePitchDiatonic(basePitch, pitchSteps);
  const nextPitch = pitchWithoutAccidental(doc, anchorLocator.partId, anchorLocator.measureIndex, transposed);

  if (ev.kind === 'rest') {
    const restIdx = ev.elementIndexes[0] ?? -1;
    if (restIdx < 0) return null;
    const base = measure.elements[restIdx];
    if (!base || base.kind !== 'note') return null;
    const next = makeNote(base, anchorLocator.staffNumber, anchorLocator.voice, nextPitch, dur, type, dotCount, false);
    measure.elements[restIdx] = next;
    const cleared = clearAccidental(doc, { ...anchorLocator, target: 'note' }) ?? doc;
    return { doc: cleared, pendingLocator: { ...anchorLocator, target: 'note', indexInMeasure: anchorLocator.indexInMeasure } };
  }

  const insertAt = Math.max(...ev.elementIndexes) + 1;
  const root = ev.root;
  const base = root;
  const next = makeNote(base, anchorLocator.staffNumber, anchorLocator.voice, nextPitch, root.duration, root.type ?? type, root.dots, true);
  measure.elements.splice(insertAt, 0, next);
  const cleared = clearAccidental(doc, anchorLocator) ?? doc;
  const pendingLocator: NoteLocator = { ...anchorLocator, indexInMeasure: anchorLocator.indexInMeasure + 1, target: 'note' };
  return { doc: cleared, pendingLocator };
}

