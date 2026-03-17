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

export function applyDuration(xml: string, locator: NoteLocator, duration: DurationValue): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const ns = doc.documentElement.namespaceURI ?? null;
  const getByTag = (parent: Element, tag: string) =>
    ns ? parent.getElementsByTagNameNS(ns, tag) : parent.getElementsByTagName(tag);
  const createEl = (tag: string) => (ns ? doc.createElementNS(ns, tag) : doc.createElement(tag));

  const parts = ns ? doc.getElementsByTagNameNS(ns, 'part') : doc.getElementsByTagName('part');
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
  if (!partEl) return null;

  const measures = getByTag(partEl, 'measure');
  const measureEl = measures[locator.measureIndex] ?? null;
  if (!measureEl) return null;

  const getActiveDivisions = (): number => {
    let divs = 1;
    for (let mi = 0; mi <= locator.measureIndex; mi++) {
      const m = measures[mi];
      if (!m) continue;
      const attrs = getByTag(m, 'attributes')[0];
      if (!attrs) continue;
      const divEl = getByTag(attrs, 'divisions')[0];
      if (!divEl) continue;
      const v = Number(divEl.textContent ?? '');
      if (Number.isFinite(v) && v > 0) divs = v;
    }
    return divs;
  };

  const divisions = getActiveDivisions();
  const newDurationValue = durationInDivisions(divisions, duration);
  const newType = TYPE_BY_ID[duration];

  const notes = getByTag(measureEl, 'note');
  const noteHasPitch = (note: Element | null) => !!note && getByTag(note, 'pitch').length > 0;
  const noteHasChord = (note: Element | null) => !!note && getByTag(note, 'chord').length > 0;
  const noteMatchesStaffVoice = (note: Element | null) => {
    if (!note) return false;
    const staffEl = getByTag(note, 'staff')[0];
    const noteStaffNumber = staffEl ? Number(staffEl.textContent ?? '') : 1;
    if (Number.isFinite(noteStaffNumber) && noteStaffNumber !== locator.staffNumber) return false;
    if (!Number.isFinite(noteStaffNumber) && locator.staffNumber !== 1) return false;
    if (locator.voice) {
      const voiceEl = getByTag(note, 'voice')[0];
      const v = voiceEl?.textContent?.trim();
      if (v !== locator.voice) return false;
    }
    return true;
  };
  const applyToNote = (note: Element) => {
    let typeEl = getByTag(note, 'type')[0];
    if (!typeEl) {
      typeEl = createEl('type');
      note.appendChild(typeEl);
    }
    typeEl.textContent = newType;

    let durEl = getByTag(note, 'duration')[0];
    if (!durEl) {
      durEl = createEl('duration');
      note.insertBefore(durEl, note.firstChild);
    }
    durEl.textContent = String(newDurationValue);

    const dots = Array.from(getByTag(note, 'dot'));
    for (const d of dots) d.remove();
    const tm = getByTag(note, 'time-modification')[0];
    tm?.remove();
  };

  let pitchIndex = 0;
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i] ?? null;
    if (!noteHasPitch(note)) continue;
    if (!noteMatchesStaffVoice(note)) continue;

    if (pitchIndex === locator.indexInMeasure) {
      // If this note is part of a chord, apply to the whole chord group
      // (root note + following <chord/> notes within same staff/voice).
      let rootIdx = i;
      while (
        rootIdx > 0 &&
        noteHasPitch(notes[rootIdx - 1] ?? null) &&
        noteMatchesStaffVoice(notes[rootIdx - 1] ?? null) &&
        noteHasChord(notes[rootIdx] ?? null)
      ) {
        rootIdx--;
      }

      const root = notes[rootIdx] ?? null;
      if (!root) return null;
      applyToNote(root);

      let j = rootIdx + 1;
      while (j < notes.length) {
        const next = notes[j] ?? null;
        if (!noteHasPitch(next)) {
          j++;
          continue;
        }
        if (!noteMatchesStaffVoice(next)) break;
        if (!noteHasChord(next)) break;
        applyToNote(next as Element);
        j++;
      }

      return new XMLSerializer().serializeToString(doc);
    }

    pitchIndex++;
  }

  return null;
}

