import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LearningCourse } from '../models/learning-course.model';

@Injectable({
  providedIn: 'root'
})
export class LearningCourseService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/theory/learningcourses`;

  constructor(private http: HttpClient) { }

  getAllCourses(): Observable<LearningCourse[]> {
    return this.http.get<LearningCourse[]>(this.apiUrl);
  }

  getCourseById(id: string): Observable<LearningCourse> {
    return this.http.get<LearningCourse>(`${this.apiUrl}/${id}`);
  }
}
