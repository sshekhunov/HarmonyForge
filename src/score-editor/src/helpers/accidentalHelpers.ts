/**
 * MusicXML accidental helpers: apply alter and accidental to the nth pitch note.
 * Uses document namespace when present for proper MusicXML handling.
 */

/**
 * Applies an accidental to the note at the given pitch-note index (same order as OSMD measure-first).
 * Returns the modified XML string, or null if the note was not found.
 */
export function applyAccidentalToXml(
  xml: string,
  noteIndex: number,
  alter: number,
  accidentalName: string
): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const ns = doc.documentElement.namespaceURI ?? null;
  const getByTag = (parent: Element, tag: string) =>
    ns ? parent.getElementsByTagNameNS(ns, tag) : parent.getElementsByTagName(tag);
  const createEl = (tag: string) =>
    ns ? doc.createElementNS(ns, tag) : doc.createElement(tag);
  const allNotes = ns
    ? doc.getElementsByTagNameNS(ns, 'note')
    : doc.getElementsByTagName('note');

  let pitchNoteIndex = 0;
  for (let i = 0; i < allNotes.length; i++) {
    const note = allNotes[i];
    if (!note || getByTag(note, 'pitch').length === 0) continue;
    if (pitchNoteIndex === noteIndex) {
      const pitch = getByTag(note, 'pitch')[0];
      if (!pitch) break;
      let alterEl = getByTag(pitch, 'alter')[0];
      if (!alterEl) {
        alterEl = createEl('alter');
        pitch.appendChild(alterEl);
      }
      alterEl.textContent = String(alter);
      const accTags = getByTag(note, 'accidental');
      let accEl = accTags[0];
      if (accidentalName) {
        if (!accEl) {
          accEl = createEl('accidental');
          note.insertBefore(accEl, note.firstChild);
        }
        accEl.textContent = accidentalName;
      } else if (accEl) {
        accEl.remove();
      }
      return new XMLSerializer().serializeToString(doc);
    }
    pitchNoteIndex++;
  }
  return null;
}

export type NoteLocator = {
  partId?: string;
  /** 0-based index of <measure> within the target <part> */
  measureIndex: number;
  /** MusicXML staff number (typically 1-based). */
  staffNumber: number;
  /** Optional MusicXML voice number/string. */
  voice?: string;
  /** Pitch-note index within the filtered measure/staff(/voice). */
  indexInMeasure: number;
};

/**
 * Applies an accidental using a robust locator:
 * part (optional) + measure index + staff + (optional) voice + index-in-measure.
 */
export function applyAccidentalToXmlByLocator(
  xml: string,
  locator: NoteLocator,
  alter: number,
  accidentalName: string
): string | null {
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

  const notes = getByTag(measureEl, 'note');
  let pitchIndex = 0;
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (!note || getByTag(note, 'pitch').length === 0) continue;

    const staffEl = getByTag(note, 'staff')[0];
    const noteStaffNumber = staffEl ? Number(staffEl.textContent ?? '') : 1;
    if (Number.isFinite(noteStaffNumber) && noteStaffNumber !== locator.staffNumber) continue;
    if (!Number.isFinite(noteStaffNumber) && locator.staffNumber !== 1) continue;

    if (locator.voice) {
      const voiceEl = getByTag(note, 'voice')[0];
      const v = voiceEl?.textContent?.trim();
      if (v !== locator.voice) continue;
    }

    if (pitchIndex === locator.indexInMeasure) {
      const pitch = getByTag(note, 'pitch')[0];
      if (!pitch) break;

      let alterEl = getByTag(pitch, 'alter')[0];
      if (!alterEl) {
        alterEl = createEl('alter');
        pitch.appendChild(alterEl);
      }
      alterEl.textContent = String(alter);

      const accTags = getByTag(note, 'accidental');
      let accEl = accTags[0];
      if (accidentalName) {
        if (!accEl) {
          accEl = createEl('accidental');
          note.insertBefore(accEl, note.firstChild);
        }
        accEl.textContent = accidentalName;
      } else if (accEl) {
        accEl.remove();
      }
      return new XMLSerializer().serializeToString(doc);
    }

    pitchIndex++;
  }

  return null;
}
