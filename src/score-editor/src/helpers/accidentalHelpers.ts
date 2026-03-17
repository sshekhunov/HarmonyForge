/**
 * MusicXML accidental helpers: apply alter and accidental to the nth pitch note.
 * Uses document namespace when present for proper MusicXML handling.
 */

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
export function applyAccidental(
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

export function clearAccidental(xml: string, locator: NoteLocator): string | null {
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

  const getActiveKeyFifths = (): number => {
    let fifths = 0;
    for (let mi = 0; mi <= locator.measureIndex; mi++) {
      const m = measures[mi];
      if (!m) continue;
      const attrs = getByTag(m, 'attributes')[0];
      if (!attrs) continue;
      const key = getByTag(attrs, 'key')[0];
      if (!key) continue;
      const fifthsEl = getByTag(key, 'fifths')[0];
      if (!fifthsEl) continue;
      const v = Number(fifthsEl.textContent ?? '');
      if (Number.isFinite(v)) fifths = v;
    }
    return fifths;
  };

  const keyAlterForStep = (step: string, fifths: number): number => {
    const sharps = ['F', 'C', 'G', 'D', 'A', 'E', 'B'] as const;
    const flats = ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const;
    const up = step.toUpperCase();
    if (fifths > 0) return sharps.slice(0, Math.min(7, fifths)).includes(up as any) ? 1 : 0;
    if (fifths < 0) return flats.slice(0, Math.min(7, -fifths)).includes(up as any) ? -1 : 0;
    return 0;
  };

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

      const stepEl = getByTag(pitch, 'step')[0];
      const step = stepEl?.textContent?.trim() ?? '';
      const fifths = getActiveKeyFifths();
      const keyAlter = step ? keyAlterForStep(step, fifths) : 0;

      let alterEl = getByTag(pitch, 'alter')[0];
      if (keyAlter === 0) {
        alterEl?.remove();
      } else {
        if (!alterEl) {
          alterEl = createEl('alter');
          pitch.appendChild(alterEl);
        }
        alterEl.textContent = String(keyAlter);
      }

      const accEl = getByTag(note, 'accidental')[0];
      accEl?.remove();

      return new XMLSerializer().serializeToString(doc);
    }
    pitchIndex++;
  }

  return null;
}
