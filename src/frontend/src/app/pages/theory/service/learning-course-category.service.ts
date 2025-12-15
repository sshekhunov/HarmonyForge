import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LearningCourseCategory } from '../models/learning-course-category.model';

@Injectable({
  providedIn: 'root'
})
export class LearningCourseCategoryService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/theory/LearningCourseCategories`;

  constructor(private http: HttpClient) { }

  getAllCategories(): Observable<LearningCourseCategory[]> {
    return this.http.get<LearningCourseCategory[]>(this.apiUrl);
  }

  getCategoryById(id: string): Observable<LearningCourseCategory> {
    return this.http.get<LearningCourseCategory>(`${this.apiUrl}/${id}`);
  }
}

