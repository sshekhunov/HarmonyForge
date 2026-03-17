export interface GraphicNote {
  sourceNote?: {
    noteheadColor?: string;
    isRest?: () => boolean;
    SourceMeasure?: { measureListIndex?: number; MeasureListIndex?: number };
    ParentStaff?: {
      Id?: number;
      idInMusicSheet?: number;
      ParentInstrument?: { IdString?: string; idString?: string };
    };
    ParentVoiceEntry?: { ParentVoice?: { VoiceId?: number | string; voiceId?: number | string } };
  };
  getNoteheadSVGs?: () => HTMLElement[];
  parentVoiceEntry?: { notes?: unknown[] };
}

export type MeasureList = unknown[][];

