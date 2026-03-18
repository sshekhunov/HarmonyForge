import type { NoteLocator } from '../models/musicXml';
import type { MusicXmlDocument, MusicXmlMeasure, MusicXmlNote } from '../models/musicXmlDocument';
import type { MusicXmlVoiceEvent } from '../models/musicXmlVoiceEvents';
import { extractVoiceEvents, getActiveDivisionsForMeasure, getIndexedPart } from './musicXmlHelper';

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

const ID_BY_TYPE: Record<string, DurationValue | undefined> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': '16th',
  '32nd': '32nd',
  '64th': '64th',
};

const ORDERED_BASE_TYPES: Array<{ id: DurationValue; quarters: number }> = [
  { id: 'whole', quarters: 4 },
  { id: 'half', quarters: 2 },
  { id: 'quarter', quarters: 1 },
  { id: 'eighth', quarters: 1 / 2 },
  { id: '16th', quarters: 1 / 4 },
  { id: '32nd', quarters: 1 / 8 },
  { id: '64th', quarters: 1 / 16 },
];

/**
 * Converts a base duration id into MusicXML duration units for a given divisions value.
 */
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

/**
 * Picks the nearest MusicXML <type> for a given duration value (in divisions).
 */
function bestBaseDurationId(divisions: number, durationValue: number): DurationValue {
  const q = durationValue / Math.max(1, divisions);
  let best = ORDERED_BASE_TYPES[2]!.id;
  let bestErr = Number.POSITIVE_INFINITY;
  for (const c of ORDERED_BASE_TYPES) {
    const err = Math.abs(q - c.quarters);
    if (err < bestErr) {
      bestErr = err;
      best = c.id;
    }
  }
  return best;
}

/**
 * Updates the editable duration representation on a note.
 */
function setNoteDurationAndType(note: MusicXmlNote, durationValue: number, typeId: DurationValue, dotCount: 0 | 1 | 2) {
  note.duration = Math.max(1, Math.round(durationValue));
  note.type = TYPE_BY_ID[typeId];
  note.dots = dotCount;
}

/**
 * Deletes all measure elements that belong to an extracted event (note/chord/rest).
 */
function deleteEventFromMeasure(measure: MusicXmlMeasure, ev: MusicXmlVoiceEvent) {
  const toRemove = new Set(ev.elementIndexes);
  measure.elements = measure.elements.filter((_, idx) => !toRemove.has(idx));
}

/**
 * Applies a new duration to an extracted event and synchronizes all chord notes.
 */
function setEventDuration(ev: MusicXmlVoiceEvent, durationValue: number, divisions: number) {
  const typeId = bestBaseDurationId(divisions, durationValue);
  const notes = ev.kind === 'chord' ? (ev.chordNotes.length ? ev.chordNotes : [ev.root]) : [ev.root];
  for (const n of notes) setNoteDurationAndType(n, durationValue, typeId, 0);
  ev.duration = durationValue;
}

/**
 * Ensures a tie marker exists on the event notes.
 */
function addTieToEvent(ev: MusicXmlVoiceEvent, tieType: 'start' | 'stop') {
  const notes = ev.kind === 'chord' ? (ev.chordNotes.length ? ev.chordNotes : [ev.root]) : [ev.root];
  for (const n of notes) if (!n.ties.includes(tieType)) n.ties.push(tieType);
}

/**
 * Returns a multiplicative factor for dotted notes.
 */
function dotMultiplier(dotCount: 0 | 1 | 2): number {
  return dotCount === 1 ? 1.5 : dotCount === 2 ? 1.75 : 1;
}

/**
 * Creates a rest note element sized to a duration gap.
 */
function createRestNote(durationValue: number, divisions: number, staff: number, voice?: string): MusicXmlNote {
  const typeId = bestBaseDurationId(divisions, durationValue);
  return {
    kind: 'note',
    rawXml: '',
    staff,
    voice,
    chord: false,
    duration: Math.max(1, Math.round(durationValue)),
    type: TYPE_BY_ID[typeId],
    dots: 0,
    ties: [],
  };
}

/**
 * Reads the selected event duration type from the current document model.
 */
export function getDurationIdFromDoc(doc: MusicXmlDocument, locator: NoteLocator): DurationValue | null {
  const part = getIndexedPart(doc, locator.partId);
  const measure = part?.measures[locator.measureIndex];
  if (!part || !measure) return null;
  const extracted = extractVoiceEvents(measure, part.measures, locator);
  const ev = extracted.selectedEvent;
  if (!ev) return null;

  const rawType = (ev.root.type ?? '').trim().toLowerCase();
  const mapped = rawType ? ID_BY_TYPE[rawType] : undefined;
  if (mapped) return mapped;

  const dur = ev.duration;
  if (!dur || dur <= 0) return null;
  return bestBaseDurationId(extracted.divisions, dur);
}

/**
 * Reads the selected event dot count (0..2) from the current document model.
 */
export function getDotCountFromDoc(doc: MusicXmlDocument, locator: NoteLocator): 0 | 1 | 2 | null {
  const part = getIndexedPart(doc, locator.partId);
  const measure = part?.measures[locator.measureIndex];
  if (!part || !measure) return null;
  const extracted = extractVoiceEvents(measure, part.measures, locator);
  const ev = extracted.selectedEvent;
  return ev ? ev.root.dots : null;
}

/**
 * Applies a duration change and reflows the voice by consuming/filling time with events/rests.
 * When duration overflows measure end, creates continuations in following measures using ties.
 */
export function applyDurationWithReflow(
  current: MusicXmlDocument,
  locator: NoteLocator,
  duration: DurationValue,
  dotCount: 0 | 1 | 2 = 0
): MusicXmlDocument | null {
  const doc = structuredClone(current);
  const part = getIndexedPart(doc, locator.partId);
  if (!part) return null;
  const measure = part.measures[locator.measureIndex];
  if (!measure) return null;

  const extracted = extractVoiceEvents(measure, part.measures, locator);
  const { events, selectedEvent, oldSelectedDuration, measureTotal, divisions } = extracted;
  if (!selectedEvent) return null;

  const base = durationInDivisions(divisions, duration);
  const targetNewDuration = Math.max(1, Math.round(base * dotMultiplier(dotCount)));

  const notesToApply =
    selectedEvent.kind === 'chord'
      ? selectedEvent.chordNotes.length
        ? selectedEvent.chordNotes
        : [selectedEvent.root]
      : [selectedEvent.root];

  if (selectedEvent.kind === 'rest') {
    setNoteDurationAndType(selectedEvent.root, targetNewDuration, bestBaseDurationId(divisions, targetNewDuration), dotCount);
  } else {
    for (const n of notesToApply) setNoteDurationAndType(n, targetNewDuration, duration, dotCount);
  }
  selectedEvent.duration = targetNewDuration;

  const delta = targetNewDuration - oldSelectedDuration;
  const remainingInMeasure = Math.max(0, measureTotal - selectedEvent.startTime);

  if (targetNewDuration > remainingInMeasure) {
    const overflow = targetNewDuration - remainingInMeasure;
    setEventDuration(selectedEvent, remainingInMeasure, divisions);

    const selectedIdx = events.indexOf(selectedEvent);
    for (let k = events.length - 1; k > selectedIdx; k--) deleteEventFromMeasure(measure, events[k]!);
    addTieToEvent(selectedEvent, 'start');

    let overflowLeft = overflow;
    let mi = locator.measureIndex + 1;
    while (overflowLeft > 0) {
      const nextMeasure = part.measures[mi];
      if (!nextMeasure) return null;

      const divNext = getActiveDivisionsForMeasure(part.measures, mi);
      const overflowInQuarters = overflowLeft / Math.max(1, divisions);
      const overflowInNextDivs = Math.max(1, Math.round(overflowInQuarters * Math.max(1, divNext)));

      const nextExtracted = extractVoiceEvents(nextMeasure, part.measures, { ...locator, measureIndex: mi });
      const nextEvents = nextExtracted.events;
      const nextTotal = nextExtracted.measureTotal;
      const chunk = Math.min(overflowInNextDivs, nextTotal > 0 ? nextTotal : overflowInNextDivs);

      let consume = chunk;
      for (let ei = 0; ei < nextEvents.length && consume > 0; ei++) {
        const ev = nextEvents[ei]!;
        if (consume >= ev.duration) {
          consume -= ev.duration;
          deleteEventFromMeasure(nextMeasure, ev);
        } else {
          setEventDuration(ev, Math.max(1, ev.duration - consume), divNext);
          consume = 0;
        }
      }

      const originalNotes =
        selectedEvent.kind === 'chord'
          ? selectedEvent.chordNotes.length
            ? selectedEvent.chordNotes
            : [selectedEvent.root]
          : [selectedEvent.root];

      const contNotes: MusicXmlNote[] = originalNotes.map((n, idx) => {
        const clone = structuredClone(n);
        clone.chord = idx !== 0;
        clone.staff = locator.staffNumber;
        clone.voice = clone.voice ?? locator.voice;
        clone.ties = ['stop'];
        setNoteDurationAndType(clone, chunk, bestBaseDurationId(divNext, chunk), 0);
        return clone;
      });

      if (overflowLeft > chunk) for (const n of contNotes) if (!n.ties.includes('start')) n.ties.push('start');

      let insertAt = 0;
      for (let i = 0; i < nextMeasure.elements.length; i++) {
        if (nextMeasure.elements[i]?.kind === 'attributes') insertAt = i + 1;
        else break;
      }
      nextMeasure.elements.splice(insertAt, 0, ...contNotes);

      overflowLeft = Math.max(0, overflowLeft - Math.round(overflowInQuarters * divisions));
      mi++;
    }

    return doc;
  }

  const idx = events.indexOf(selectedEvent);
  if (delta < 0) {
    const freed = -delta;
    const next = events[idx + 1] ?? null;
    if (next && next.kind === 'rest' && next.startTime === selectedEvent.startTime + selectedEvent.duration) {
      setEventDuration(next, next.duration + freed, divisions);
    } else {
      const rest = createRestNote(freed, divisions, locator.staffNumber, locator.voice);
      const insertAfterIdx = measure.elements.indexOf(selectedEvent.root);
      measure.elements.splice(Math.max(0, insertAfterIdx + 1), 0, rest);
    }
  } else if (delta > 0) {
    let consume = delta;
    for (let ei = idx + 1; ei < events.length && consume > 0; ei++) {
      const ev = events[ei]!;
      if (consume >= ev.duration) {
        consume -= ev.duration;
        deleteEventFromMeasure(measure, ev);
      } else {
        setEventDuration(ev, Math.max(1, ev.duration - consume), divisions);
        consume = 0;
      }
    }
  }

  return doc;
}

