import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LearningCourse } from '../models/learning-course.model';

@Injectable({
  providedIn: 'root'
})
export class LearningCourseService {
  private readonly apiUrl = 'http://localhost:5065/api/theory/learningcourses';

  constructor(private http: HttpClient) { }

  getAllCourses(): Observable<LearningCourse[]> {
    return this.http.get<LearningCourse[]>(this.apiUrl);
  }

  getCourseById(id: string): Observable<LearningCourse> {
    return this.http.get<LearningCourse>(`${this.apiUrl}/${id}`);
  }
}
