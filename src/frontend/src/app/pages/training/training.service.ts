import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HarmonyAnalysisRequest, HarmonyAnalysisResponse } from './training.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/harmony/harmonyanalysis`;

  constructor(private http: HttpClient) { }

  analyzeHarmony(request: HarmonyAnalysisRequest): Observable<HarmonyAnalysisResponse> {
    return this.http.post<HarmonyAnalysisResponse>(this.apiUrl, request);
  }
}
