import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LearningArticle } from '../models/learning-article.model';

@Injectable({
  providedIn: 'root'
})
export class LearningArticleService {
  private readonly apiUrl = 'http://localhost:5065/api/theory/learningarticles';

  constructor(private http: HttpClient) { }

  getAllArticles(): Observable<LearningArticle[]> {
    return this.http.get<LearningArticle[]>(this.apiUrl);
  }

  getArticleById(id: string): Observable<LearningArticle> {
    return this.http.get<LearningArticle>(`${this.apiUrl}/${id}`);
  }

  getArticlesByModuleId(moduleId: string): Observable<LearningArticle[]> {
    return this.http.get<LearningArticle[]>(`${this.apiUrl}/module/${moduleId}`);
  }
}
