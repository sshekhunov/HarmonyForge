import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LearningCourse, LearningModule } from '../../models/learning-course.model';
import { LearningArticle, LearningArticleWithModule } from '../../models/learning-article.model';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss']
})
export class CourseDetailComponent implements OnInit {
  @Input() course: LearningCourse | null = null;
  @Input() articlesByModule: { [moduleId: string]: LearningArticleWithModule[] } = {};
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() expandedModules: Set<string> = new Set();
  
  @Output() goBack = new EventEmitter<void>();
  @Output() articleSelected = new EventEmitter<{article: LearningArticle, module: LearningModule}>();
  @Output() moduleToggled = new EventEmitter<string>();
  @Output() retryLoad = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

  onGoBack() {
    this.goBack.emit();
  }

  onArticleSelected(article: LearningArticle, module: LearningModule) {
    this.articleSelected.emit({ article, module });
  }

  onModuleToggled(moduleId: string) {
    this.moduleToggled.emit(moduleId);
  }

  onRetryLoad() {
    this.retryLoad.emit();
  }

  getModulesWithArticles() {
    if (!this.course) return [];

    return this.course.modules.map(module => ({
      ...module,
      articles: this.articlesByModule[module.id] || []
    }));
  }

  isModuleExpanded(moduleId: string): boolean {
    return this.expandedModules.has(moduleId);
  }

  getModuleNumber(module: LearningModule): number {
    return module.number || 0;
  }

  getArticleTitle(article: LearningArticle): string {
    return article.title || 'Статья';
  }

  getArticleDescription(article: LearningArticle): string {
    return article.description || 'Описание статьи недоступно';
  }

  getArticleNumber(article: LearningArticle): number {
    return article.number || 0;
  }

  trackByModuleId(index: number, module: any): string {
    return module.id;
  }

  trackByArticleId(index: number, articleWithModule: LearningArticleWithModule): string {
    return articleWithModule.article.id;
  }
}
