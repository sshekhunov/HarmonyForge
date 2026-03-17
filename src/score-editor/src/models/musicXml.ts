export type NoteLocator = {
  partId?: string;
  /** 0-based index of <measure> within the target <part> */
  measureIndex: number;
  /** MusicXML staff number (typically 1-based). */
  staffNumber: number;
  /** Optional MusicXML voice number/string. */
  voice?: string;
  /** What kind of element is selected in the voice. */
  target?: 'note' | 'rest';
  /** Event index within the filtered measure/staff(/voice), counting rests and chord groups. */
  eventIndex?: number;
  /** Pitch-note index within the filtered measure/staff(/voice). */
  indexInMeasure: number;
};

