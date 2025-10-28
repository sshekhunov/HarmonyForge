import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HarmonyAnalysisRequest, HarmonyAnalysisResponse } from './training.model';

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private readonly apiUrl = 'http://localhost:5102/HarmonyAnalysis/AnalyseHarmony';

  constructor(private http: HttpClient) { }

  analyzeHarmony(request: HarmonyAnalysisRequest): Observable<HarmonyAnalysisResponse> {
    console.log('Sending request:', request);
    console.log('Request URL:', this.apiUrl);

    return this.http.post<HarmonyAnalysisResponse>(this.apiUrl, request);
  }
}
