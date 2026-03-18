import type { MusicXmlMeasureElement, MusicXmlNote } from './musicXmlDocument';

export type MusicXmlVoiceEvent = {
  kind: 'chord' | 'note' | 'rest';
  startTime: number;
  duration: number;
  root: MusicXmlNote;
  chordNotes: MusicXmlNote[];
  elementIndexes: number[];
};

export type MusicXmlExtractVoiceEventsResult = {
  events: MusicXmlVoiceEvent[];
  selectedEvent: MusicXmlVoiceEvent | null;
  oldSelectedDuration: number;
  measureTotal: number;
  divisions: number;
};

export function isMusicXmlNote(e: MusicXmlMeasureElement): e is MusicXmlNote {
  return e.kind === 'note';
}

