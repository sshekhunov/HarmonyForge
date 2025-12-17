export interface HarmonyAnalysisRequest {
  musicXmlContent: string;
}

export interface HarmonyAnalysisResponse {
  isSuccessful: boolean;
  errorMessage?: string;
  analysisResult?: AnalysisResult;
}

export interface AnalysisResult {
  score: number;
  feedback: string;
  positions: AnalysisResultPosition[];
}

export interface AnalysisResultPosition {
  position: number;
  title: string;
  feedback: string;
  severity: SeverityLevel;
  relatedNotes: MusicXmlNotePosition[];
}

export enum SeverityLevel {
  Low = 0,
  Medium = 1,
  High = 2
}

export interface MusicXmlNotePosition {
  measureArrayIndex: number;
  measureIndex: number;
  staffEntryIndex: number;
  voiceEntryIndex: number;
  noteIndex: number;
}
