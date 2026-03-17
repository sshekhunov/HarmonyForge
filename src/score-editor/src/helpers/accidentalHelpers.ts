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
