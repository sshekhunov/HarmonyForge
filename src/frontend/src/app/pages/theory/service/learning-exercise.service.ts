import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LearningExercise } from '../models/learning-exercise.model';

@Injectable({
  providedIn: 'root'
})
export class LearningExerciseService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/theory/learningexercises`;

  constructor(private http: HttpClient) { }

  getAllExercises(): Observable<LearningExercise[]> {
    return this.http.get<LearningExercise[]>(this.apiUrl);
  }

  getExerciseById(id: string): Observable<LearningExercise> {
    return this.http.get<LearningExercise>(`${this.apiUrl}/${id}`);
  }

  getExercisesByModuleId(moduleId: string): Observable<LearningExercise[]> {
    return this.http.get<LearningExercise[]>(`${this.apiUrl}/module/${moduleId}`);
  }
}

