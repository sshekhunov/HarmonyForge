export type MusicXmlPitch = {
  step: string;
  octave: number;
  alter?: number;
};

export type MusicXmlTieType = 'start' | 'stop';

export type MusicXmlNote = {
  kind: 'note';
  /** Original `<note>` XML preserved for stable reserialization (beams, stems, etc.). */
  rawXml: string;
  staff: number;
  voice?: string;
  chord: boolean;
  duration: number;
  type?: string;
  dots: 0 | 1 | 2;
  pitch?: MusicXmlPitch;
  accidental?: string;
  ties: MusicXmlTieType[];
};

export type MusicXmlBackup = {
  kind: 'backup';
  duration: number;
};

export type MusicXmlForward = {
  kind: 'forward';
  duration: number;
};

export type MusicXmlAttributes = {
  kind: 'attributes';
  divisions?: number;
  keyFifths?: number;
  rawXml: string;
};

export type MusicXmlRawElement = {
  kind: 'raw';
  rawXml: string;
};

export type MusicXmlMeasureElement = MusicXmlNote | MusicXmlBackup | MusicXmlForward | MusicXmlAttributes | MusicXmlRawElement;

export type MusicXmlMeasure = {
  measureIndex: number;
  number?: string;
  elements: MusicXmlMeasureElement[];
};

export type MusicXmlPart = {
  id?: string;
  measures: MusicXmlMeasure[];
};

/**
 * Parsed MusicXML document used by the editor.
 *
 * Helpers and components must only work with these typed models.
 * XML parsing/serialization happens exclusively in `musicXmlHelper`.
 */
export type MusicXmlDocument = {
  /**
   * Exact source XML that was opened.
   *
   * Serialization rewrites measures inside this original document to preserve:
   * namespaces, doctype, encoding hints, part-list, and any vendor extensions.
   */
  sourceXml: string;
  /**
   * Raw XML elements at the `<score-partwise>` level that the editor doesn't model
   * (e.g. `<part-list>`, `<work>`, `<identification>`).
   *
   * These are preserved verbatim so OSMD receives a structurally valid document.
   */
  headerRawElements: string[];
  /** `score-partwise@version` from the source file (commonly "3.1" or "4.0"). */
  version?: string;
  parts: MusicXmlPart[];
};

