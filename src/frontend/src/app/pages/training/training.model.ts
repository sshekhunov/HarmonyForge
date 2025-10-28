export interface HarmonyAnalysisRequest {
  musicXmlContent: string;
}

export interface HarmonyAnalysisResponse {
  noteCount: number;
  isSuccessful: boolean;
  errorMessage?: string;
}
