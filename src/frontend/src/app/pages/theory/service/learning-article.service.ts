import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LearningArticle } from '../models/learning-article.model';

@Injectable({
  providedIn: 'root'
})
export class LearningArticleService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/theory/learningarticles`;

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
