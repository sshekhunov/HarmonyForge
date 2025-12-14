import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LearningItem } from '../models/learning-item.model';

@Injectable({
  providedIn: 'root'
})
export class LearningItemService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/theory/learningitems`;

  constructor(private http: HttpClient) { }

  getItemsByModuleId(moduleId: string): Observable<LearningItem[]> {
    return this.http.get<LearningItem[]>(`${this.apiUrl}/module/${moduleId}`);
  }
}

