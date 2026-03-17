import type { NoteLocator } from '../models/musicXml';

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

function durationInDivisions(divisions: number, id: DurationValue): number {
  // MusicXML duration is in "divisions" units, where a quarter note == divisions.
  // So: whole=4q, half=2q, quarter=1q, eighth=1/2q, 16th=1/4q, ...
  const q = divisions;
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

  const v = Math.round(raw);
  return Math.max(1, v);
}

export function getDurationIdFromXml(xml: string, locator: NoteLocator): DurationValue | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const ctx = buildXmlCtx(doc);
  const { measures } = getPartAndMeasures(doc, ctx, locator);
  if (!measures) return null;
  const measureEl = measures[locator.measureIndex] ?? null;
  if (!measureEl) return null;

  const extracted = extractVoiceEvents(measureEl, measures, ctx, locator);
  const ev = extracted?.selectedEvent ?? null;
  if (!ev) return null;

  // Prefer <type> if present on the root note.
  const typeEl = ctx.getByTag(ev.root, 'type')[0];
  const rawType = typeEl?.textContent?.trim() ?? '';
  const mapped = rawType ? ID_BY_TYPE[rawType.toLowerCase()] : undefined;
  if (mapped) return mapped;

  // Fallback: map <duration> / divisions to nearest base duration.
  const divisions = extracted?.divisions ?? getActiveDivisionsForMeasure(measures, ctx, locator.measureIndex);
  const dur = ev.duration;
  if (!dur || dur <= 0) return null;
  return bestBaseDurationId(divisions, dur);
}

export function getDotCountFromXml(xml: string, locator: NoteLocator): 0 | 1 | 2 | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const ctx = buildXmlCtx(doc);
  const { measures } = getPartAndMeasures(doc, ctx, locator);
  if (!measures) return null;
  const measureEl = measures[locator.measureIndex] ?? null;
  if (!measureEl) return null;

  const extracted = extractVoiceEvents(measureEl, measures, ctx, locator);
  const ev = extracted?.selectedEvent ?? null;
  if (!ev) return null;
  const dots = Array.from(ctx.getByTag(ev.root, 'dot')).length;
  if (dots <= 0) return 0;
  if (dots === 1) return 1;
  return 2;
}

function bestBaseDurationId(divisions: number, durationValue: number): DurationValue {
  const q = durationValue / Math.max(1, divisions);
  let best = ORDERED_BASE_TYPES[2]!.id; // quarter
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

type XmlCtx = {
  doc: Document;
  ns: string | null;
  getByTag: (parent: Element, tag: string) => HTMLCollectionOf<Element>;
  createEl: (tag: string) => Element;
};

function buildXmlCtx(doc: Document): XmlCtx {
  const ns = doc.documentElement.namespaceURI ?? null;
  const getByTag = (parent: Element, tag: string) =>
    ns ? parent.getElementsByTagNameNS(ns, tag) : parent.getElementsByTagName(tag);
  const createEl = (tag: string) => (ns ? doc.createElementNS(ns, tag) : doc.createElement(tag));
  return { doc, ns, getByTag, createEl };
}

function getPartAndMeasures(doc: Document, ctx: XmlCtx, locator: NoteLocator) {
  const parts = ctx.ns ? doc.getElementsByTagNameNS(ctx.ns, 'part') : doc.getElementsByTagName('part');
  let partEl: Element | null = null;
  if (locator.partId) {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p?.getAttribute('id') === locator.partId) {
        partEl = p;
        break;
      }
    }
  }
  partEl = partEl ?? (parts.length > 0 ? (parts[0] ?? null) : null);
  if (!partEl) return { partEl: null, measures: null as HTMLCollectionOf<Element> | null };
  const measures = ctx.getByTag(partEl, 'measure');
  return { partEl, measures };
}

function getActiveDivisionsForMeasure(measures: HTMLCollectionOf<Element>, ctx: XmlCtx, measureIndex: number): number {
  let divs = 1;
  for (let mi = 0; mi <= measureIndex; mi++) {
    const m = measures[mi];
    if (!m) continue;
    const attrs = ctx.getByTag(m, 'attributes')[0];
    if (!attrs) continue;
    const divEl = ctx.getByTag(attrs, 'divisions')[0];
    if (!divEl) continue;
    const v = Number(divEl.textContent ?? '');
    if (Number.isFinite(v) && v > 0) divs = v;
  }
  return divs;
}

function applyDotCount(note: Element, ctx: XmlCtx, dotCount: 0 | 1 | 2) {
  const existing = Array.from(ctx.getByTag(note, 'dot'));
  for (const d of existing) d.remove();
  for (let i = 0; i < dotCount; i++) note.appendChild(ctx.createEl('dot'));
}

function setNoteDurationAndType(
  note: Element,
  ctx: XmlCtx,
  durationValue: number,
  typeId: DurationValue,
  dotCount: 0 | 1 | 2
) {
  let typeEl = ctx.getByTag(note, 'type')[0];
  if (!typeEl) {
    typeEl = ctx.createEl('type');
    note.appendChild(typeEl);
  }
  typeEl.textContent = TYPE_BY_ID[typeId];

  let durEl = ctx.getByTag(note, 'duration')[0];
  if (!durEl) {
    durEl = ctx.createEl('duration');
    note.insertBefore(durEl, note.firstChild);
  }
  durEl.textContent = String(Math.max(1, Math.round(durationValue)));

  // We manage dots explicitly; always strip tuplets.
  const tm = ctx.getByTag(note, 'time-modification')[0];
  tm?.remove();
  applyDotCount(note, ctx, dotCount);
}

function ensureNotationsTied(note: Element, ctx: XmlCtx, tiedType: 'start' | 'stop') {
  let notations = ctx.getByTag(note, 'notations')[0];
  if (!notations) {
    notations = ctx.createEl('notations');
    note.appendChild(notations);
  }
  const tied = ctx.createEl('tied');
  tied.setAttribute('type', tiedType);
  notations.appendChild(tied);
}

function ensureTieElement(note: Element, ctx: XmlCtx, tieType: 'start' | 'stop') {
  const tie = ctx.createEl('tie');
  tie.setAttribute('type', tieType);
  // Insert early to follow common ordering.
  note.insertBefore(tie, note.firstChild);
}

type VoiceEvent = {
  kind: 'chord' | 'note' | 'rest';
  startTime: number;
  duration: number;
  /** Root note element (for chord/note) or rest element. */
  root: Element;
  /** For chord: includes root + chord notes. Otherwise empty. */
  chordNotes: Element[];
  /** Last XML element belonging to this event (for insertion point). */
  lastEl: Element;
  /** Index of first element in measure children (for stable insertion). */
  firstChildIndex: number;
};

function getChildElements(parent: Element): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const n = parent.childNodes[i];
    if (n && n.nodeType === Node.ELEMENT_NODE) out.push(n as Element);
  }
  return out;
}

function getTextTagValue(el: Element, ctx: XmlCtx, tag: string): string | null {
  const t = ctx.getByTag(el, tag)[0];
  const v = t?.textContent?.trim();
  return v ? v : null;
}

function getNoteVoiceStaff(note: Element, ctx: XmlCtx) {
  const staffRaw = getTextTagValue(note, ctx, 'staff');
  const staff = staffRaw ? Number(staffRaw) : 1;
  const voice = getTextTagValue(note, ctx, 'voice') ?? undefined;
  return { staff: Number.isFinite(staff) ? staff : 1, voice };
}

function getDurationValue(el: Element, ctx: XmlCtx): number {
  const d = ctx.getByTag(el, 'duration')[0];
  const v = d ? Number(d.textContent ?? '') : NaN;
  return Number.isFinite(v) ? v : 0;
}

function isRestNote(note: Element, ctx: XmlCtx) {
  return ctx.getByTag(note, 'rest').length > 0;
}

function hasPitch(note: Element, ctx: XmlCtx) {
  return ctx.getByTag(note, 'pitch').length > 0;
}

function hasChord(note: Element, ctx: XmlCtx) {
  return ctx.getByTag(note, 'chord').length > 0;
}

type ExtractResult = {
  events: VoiceEvent[];
  measureChildren: Element[];
  selectedEvent: VoiceEvent | null;
  selectedChordRootNote: Element | null;
  oldSelectedDuration: number;
  measureTotal: number;
  divisions: number;
};

function extractVoiceEvents(
  measureEl: Element,
  measures: HTMLCollectionOf<Element>,
  ctx: XmlCtx,
  locator: NoteLocator
): ExtractResult | null {
  const divisions = getActiveDivisionsForMeasure(measures, ctx, locator.measureIndex);
  const measureChildren = getChildElements(measureEl);

  const events: VoiceEvent[] = [];
  let currentTime = 0;
  let pitchCounter = 0;
  let lastTargetNonChordStartTime: number | null = null;

  let selectedEvent: VoiceEvent | null = null;
  let selectedChordRootNote: Element | null = null;
  let oldSelectedDuration = 0;

  const matchesTarget = (note: Element) => {
    const { staff, voice } = getNoteVoiceStaff(note, ctx);
    if (staff !== locator.staffNumber) return false;
    // Many MusicXML files omit <voice> on rests; be tolerant when matching.
    if (locator.voice && voice && voice !== locator.voice) return false;
    return true;
  };

  for (let ci = 0; ci < measureChildren.length; ci++) {
    const el = measureChildren[ci]!;
    const tag = el.localName;

    if (tag === 'backup') {
      currentTime -= getDurationValue(el, ctx);
      if (currentTime < 0) currentTime = 0;
      continue;
    }
    if (tag === 'forward') {
      currentTime += getDurationValue(el, ctx);
      continue;
    }
    if (tag !== 'note') continue;

    const note = el;
    if (!matchesTarget(note)) {
      // Advance time for non-target notes too (MusicXML timing is global inside measure).
      if (!hasChord(note, ctx)) currentTime += getDurationValue(note, ctx);
      continue;
    }

    const dur = getDurationValue(note, ctx);
    const isChord = hasChord(note, ctx);

    if (hasPitch(note, ctx)) {
      if (pitchCounter === locator.indexInMeasure) {
        // We'll map selected pitch note to its containing event once event exists.
        // (For chord notes, selected note might be a <chord/> note.)
      }
      pitchCounter++;
    }

    if (isRestNote(note, ctx)) {
      const ev: VoiceEvent = {
        kind: 'rest',
        startTime: currentTime,
        duration: dur,
        root: note,
        chordNotes: [],
        lastEl: note,
        firstChildIndex: ci,
      };
      events.push(ev);
      currentTime += dur;
      continue;
    }

    // Note/chord
    if (isChord) {
      // In MusicXML, <chord/> notes share the previous non-chord note's onset.
      const chordStartTime =
        lastTargetNonChordStartTime !== null ? lastTargetNonChordStartTime : Math.max(0, currentTime - dur);
      const last = events[events.length - 1];
      if (last && last.kind === 'chord' && last.startTime === chordStartTime) {
        last.chordNotes.push(note);
        last.lastEl = note;
      } else if (last && last.kind === 'note' && last.startTime === chordStartTime) {
        // Upgrade single note to chord (shouldn't happen often, but keep safe).
        last.kind = 'chord';
        last.chordNotes = [last.root, note];
        last.lastEl = note;
      } else {
        // Chord note without a root in this voice; treat as a standalone note.
        const ev: VoiceEvent = {
          kind: 'note',
          startTime: chordStartTime,
          duration: dur,
          root: note,
          chordNotes: [],
          lastEl: note,
          firstChildIndex: ci,
        };
        events.push(ev);
      }
      // chord notes do not advance time
    } else {
      const ev: VoiceEvent = {
        kind: 'note',
        startTime: currentTime,
        duration: dur,
        root: note,
        chordNotes: [],
        lastEl: note,
        firstChildIndex: ci,
      };
      events.push(ev);
      lastTargetNonChordStartTime = currentTime;
      currentTime += dur;
    }
  }

  // Compute measure total duration in this voice (sum of non-chord events).
  let measureTotal = 0;
  for (const ev of events) {
    if (ev.kind === 'chord') {
      // chord duration is on its root note
      measureTotal += ev.duration;
    } else {
      measureTotal += ev.duration;
    }
  }

  // Second pass: find selected pitch note element by reproducing our pitch indexing rule.
  // Then map it to its event.
  if (locator.target === 'rest' && typeof locator.eventIndex === 'number') {
    const ev = events[locator.eventIndex] ?? null;
    if (ev && ev.kind === 'rest') {
      selectedEvent = ev;
      oldSelectedDuration = ev.duration;
    }
  } else {
    pitchCounter = 0;
    for (const ev of events) {
      const candidateNotes =
        ev.kind === 'chord'
          ? ev.chordNotes.length > 0
            ? ev.chordNotes
            : [ev.root]
          : [ev.root];
      for (const n of candidateNotes) {
        if (!hasPitch(n, ctx)) continue;
        if (pitchCounter === locator.indexInMeasure) {
          selectedEvent = ev;
          selectedChordRootNote = ev.kind === 'chord' ? (ev.chordNotes[0] ?? ev.root) : ev.root;
          oldSelectedDuration = ev.duration;
          break;
        }
        pitchCounter++;
      }
      if (selectedEvent) break;
    }
  }

  return {
    events,
    measureChildren,
    selectedEvent,
    selectedChordRootNote,
    oldSelectedDuration,
    measureTotal,
    divisions,
  };
}

function createRestNote(ctx: XmlCtx, durationValue: number, divisions: number, staff: number, voice?: string): Element {
  const note = ctx.createEl('note');
  const rest = ctx.createEl('rest');
  note.appendChild(rest);

  const durEl = ctx.createEl('duration');
  durEl.textContent = String(Math.max(1, Math.round(durationValue)));
  note.appendChild(durEl);

  if (voice) {
    const vEl = ctx.createEl('voice');
    vEl.textContent = voice;
    note.appendChild(vEl);
  }

  const staffEl = ctx.createEl('staff');
  staffEl.textContent = String(staff);
  note.appendChild(staffEl);

  const typeId = bestBaseDurationId(divisions, durationValue);
  const typeEl = ctx.createEl('type');
  typeEl.textContent = TYPE_BY_ID[typeId];
  note.appendChild(typeEl);

  return note;
}

function insertAfter(parent: Element, afterEl: Element, newEl: Element) {
  const next = afterEl.nextSibling;
  if (next) parent.insertBefore(newEl, next);
  else parent.appendChild(newEl);
}

function deleteEvent(ev: VoiceEvent) {
  if (ev.kind === 'chord') {
    // chord notes are separate <note> elements in sequence
    for (const n of ev.chordNotes) n.remove();
    // if chordNotes didn't include root for some reason, remove root too
    if (ev.chordNotes.length === 0) ev.root.remove();
  } else {
    ev.root.remove();
  }
}

function setEventDuration(ev: VoiceEvent, ctx: XmlCtx, durationValue: number, divisions: number) {
  const typeId = bestBaseDurationId(divisions, durationValue);
  if (ev.kind === 'chord') {
    const notes = ev.chordNotes.length > 0 ? ev.chordNotes : [ev.root];
    for (const n of notes) setNoteDurationAndType(n, ctx, durationValue, typeId, 0);
  } else {
    setNoteDurationAndType(ev.root, ctx, durationValue, typeId, 0);
  }
  ev.duration = durationValue;
}

function addTieToEvent(ev: VoiceEvent, ctx: XmlCtx, tieType: 'start' | 'stop') {
  const notes = ev.kind === 'chord' ? (ev.chordNotes.length > 0 ? ev.chordNotes : [ev.root]) : [ev.root];
  for (const n of notes) {
    ensureTieElement(n, ctx, tieType);
    ensureNotationsTied(n, ctx, tieType);
  }
}

function dotMultiplier(dotCount: 0 | 1 | 2): number {
  return dotCount === 1 ? 1.5 : dotCount === 2 ? 1.75 : 1;
}

export function applyDurationWithReflow(
  xml: string,
  locator: NoteLocator,
  duration: DurationValue,
  dotCount: 0 | 1 | 2 = 0
): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const ctx = buildXmlCtx(doc);
  const { partEl, measures } = getPartAndMeasures(doc, ctx, locator);
  if (!partEl || !measures) return null;

  const measureEl = measures[locator.measureIndex] ?? null;
  if (!measureEl) return null;

  const extracted = extractVoiceEvents(measureEl, measures, ctx, locator);
  if (!extracted) return null;
  const { events, selectedEvent, oldSelectedDuration, measureTotal, divisions } = extracted;
  if (!selectedEvent) return null;

  const base = durationInDivisions(divisions, duration);
  const targetNewDuration = Math.max(1, Math.round(base * dotMultiplier(dotCount)));

  // Apply duration to selected event first.
  {
    if (selectedEvent.kind === 'rest') {
      const typeId = bestBaseDurationId(divisions, targetNewDuration);
      setNoteDurationAndType(selectedEvent.root, ctx, targetNewDuration, typeId, dotCount);
    } else {
      const typeId = duration;
      const notes =
        selectedEvent.kind === 'chord'
          ? selectedEvent.chordNotes.length > 0
            ? selectedEvent.chordNotes
            : [selectedEvent.root]
          : [selectedEvent.root];
      for (const n of notes) setNoteDurationAndType(n, ctx, targetNewDuration, typeId, dotCount);
    }
    selectedEvent.duration = targetNewDuration;
  }

  const newDur = targetNewDuration;
  const oldDur = oldSelectedDuration;
  const delta = newDur - oldDur;

  // Overflow across measures with ties (selected voice only).
  const start = selectedEvent.startTime;
  const remainingInMeasure = Math.max(0, measureTotal - start);
  if (newDur > remainingInMeasure) {
    const inMeasureDur = remainingInMeasure;
    const overflow = newDur - inMeasureDur;

    setEventDuration(selectedEvent, ctx, inMeasureDur, divisions);

    // Remove all events after selectedEvent in this measure (they're overlapped now).
    const idx = events.indexOf(selectedEvent);
    for (let k = events.length - 1; k > idx; k--) deleteEvent(events[k]!);

    // Add tie start on selected event.
    addTieToEvent(selectedEvent, ctx, 'start');

    // Spill overflow into next measures.
    let overflowLeft = overflow;
    let mi = locator.measureIndex + 1;
    let firstContinuation = true;
    while (overflowLeft > 0) {
      const nextMeasure = measures[mi] ?? null;
      if (!nextMeasure) return null;

      const divNext = getActiveDivisionsForMeasure(measures, ctx, mi);
      // Assume divisions stable; if not, scale by quarter units.
      const overflowInQuarters = overflowLeft / Math.max(1, divisions);
      const overflowInNextDivs = Math.max(1, Math.round(overflowInQuarters * Math.max(1, divNext)));

      // Extract events from next measure and remove/shorten from the beginning by the chunk we insert.
      const nextLocator: NoteLocator = { ...locator, measureIndex: mi };
      const nextExtracted = extractVoiceEvents(nextMeasure, measures, ctx, nextLocator);
      const nextEvents = nextExtracted?.events ?? [];
      const nextTotal = nextExtracted?.measureTotal ?? 0;
      const chunk = Math.min(overflowInNextDivs, nextTotal > 0 ? nextTotal : overflowInNextDivs);

      // Consume from beginning in this voice by chunk duration.
      let consume = chunk;
      for (let ei = 0; ei < nextEvents.length && consume > 0; ei++) {
        const ev = nextEvents[ei]!;
        if (consume >= ev.duration) {
          consume -= ev.duration;
          deleteEvent(ev);
        } else {
          // Shorten the first remaining event.
          setEventDuration(ev, ctx, Math.max(1, ev.duration - consume), divNext);
          consume = 0;
        }
      }

      // Create continuation chord event at the start of the measure.
      // We clone the original chord/note as a chord group with same pitches.
      const originalNotes =
        selectedEvent.kind === 'chord'
          ? selectedEvent.chordNotes.length > 0
            ? selectedEvent.chordNotes
            : [selectedEvent.root]
          : [selectedEvent.root];

      const contNotes: Element[] = [];
      for (let ni = 0; ni < originalNotes.length; ni++) {
        const clone = originalNotes[ni]!.cloneNode(true) as Element;
        // Ensure chord tag on non-root chord notes.
        const chordEl = ctx.getByTag(clone, 'chord')[0];
        if (ni === 0) chordEl?.remove();
        else if (!chordEl) {
          const ch = ctx.createEl('chord');
          clone.insertBefore(ch, clone.firstChild);
        }

        // Set voice/staff explicitly.
        const { staff, voice } = getNoteVoiceStaff(clone, ctx);
        if (voice == null && locator.voice) {
          const vEl = ctx.createEl('voice');
          vEl.textContent = locator.voice;
          clone.appendChild(vEl);
        }
        if (staff !== locator.staffNumber) {
          const sEl = ctx.getByTag(clone, 'staff')[0] ?? ctx.createEl('staff');
          sEl.textContent = String(locator.staffNumber);
          if (!sEl.parentNode) clone.appendChild(sEl);
        }

        setNoteDurationAndType(clone, ctx, chunk, bestBaseDurationId(divNext, chunk), 0);
        contNotes.push(clone);
      }

      // Tie stop (and start again if still overflowing further).
      for (const n of contNotes) {
        ensureTieElement(n, ctx, 'stop');
        ensureNotationsTied(n, ctx, 'stop');
        if (overflowLeft > chunk || !firstContinuation) {
          // If continuation itself continues to yet another measure, mark start too.
          if (overflowLeft > chunk) {
            ensureTieElement(n, ctx, 'start');
            ensureNotationsTied(n, ctx, 'start');
          }
        }
      }

      // Insert continuation notes at the beginning of measure, after <attributes> if present.
      const children = getChildElements(nextMeasure);
      const attrs = children.find((c) => c.localName === 'attributes') ?? null;
      const insertBefore = attrs ? attrs.nextSibling : nextMeasure.firstChild;
      for (const n of contNotes) {
        if (insertBefore) nextMeasure.insertBefore(n, insertBefore);
        else nextMeasure.appendChild(n);
      }

      overflowLeft = Math.max(0, overflowLeft - Math.round(overflowInQuarters * divisions)); // keep in original divisions
      firstContinuation = false;
      mi++;
    }

    return new XMLSerializer().serializeToString(doc);
  }

  // No overflow: reflow within this measure by inserting rests or consuming following events.
  const idx = events.indexOf(selectedEvent);
  if (delta < 0) {
    const freed = -delta;
    // Try to merge with an immediately following rest event in the voice.
    const next = events[idx + 1] ?? null;
    if (next && next.kind === 'rest' && next.startTime === selectedEvent.startTime + selectedEvent.duration) {
      setEventDuration(next, ctx, next.duration + freed, divisions);
    } else {
      const rest = createRestNote(ctx, freed, divisions, locator.staffNumber, locator.voice);
      insertAfter(measureEl, selectedEvent.lastEl, rest);
    }
  } else if (delta > 0) {
    let consume = delta;
    for (let ei = idx + 1; ei < events.length && consume > 0; ei++) {
      const ev = events[ei]!;
      if (consume >= ev.duration) {
        consume -= ev.duration;
        deleteEvent(ev);
      } else {
        setEventDuration(ev, ctx, Math.max(1, ev.duration - consume), divisions);
        consume = 0;
      }
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

// Backwards-compatible simple duration apply (no reflow).
export function applyDuration(xml: string, locator: NoteLocator, duration: DurationValue): string | null {
  return applyDurationWithReflow(xml, locator, duration);
}

