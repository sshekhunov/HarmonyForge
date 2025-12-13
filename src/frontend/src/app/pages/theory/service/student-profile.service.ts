import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface UpdateLearningItemStatusRequest {
  userId: string;
  learningItemId: string;
  learningItemType: 'Article' | 'Excercise' | 'Test';
  isCompleted: boolean;
}

export interface GetLearningItemStatusesRequest {
  userId: string;
  learningItemIds: string[];
  learningItemType: 'Article' | 'Excercise' | 'Test';
}

export interface LearningItemStatusDto {
  learningItemId: string;
  isCompleted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StudentProfileService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/studentprofile/learningitemstatus`;

  constructor(private http: HttpClient) { }

  updateLearningItemStatus(request: UpdateLearningItemStatusRequest): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/update`, request);
  }

  getLearningItemStatuses(request: GetLearningItemStatusesRequest): Observable<LearningItemStatusDto[]> {
    return this.http.post<LearningItemStatusDto[]>(`${this.apiUrl}/get-statuses`, request);
  }
}

