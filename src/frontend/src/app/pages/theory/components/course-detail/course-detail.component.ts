import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
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
export class CourseDetailComponent implements OnInit, OnChanges {
  @Input() course: LearningCourse | null = null;
  @Input() articlesByModule: { [moduleId: string]: LearningArticleWithModule[] } = {};
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() expandedModules: Set<string> = new Set();

  @Output() goBack = new EventEmitter<void>();
  @Output() articleSelected = new EventEmitter<{article: LearningArticle, module: LearningModule}>();
  @Output() moduleToggled = new EventEmitter<string>();
  @Output() retryLoad = new EventEmitter<void>();

  selectedModuleId: string | null = null;
  moduleProgress: Map<string, number> = new Map();

  constructor() { }

  ngOnInit(): void {
    this.initializeModuleProgress();
    this.selectFirstModule();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['course'] && this.course) {
      this.initializeModuleProgress();
      const previousCourse = changes['course'].previousValue;
      if (!previousCourse || previousCourse.id !== this.course.id) {
        this.selectedModuleId = null;
        this.selectFirstModule();
      } else if (!this.selectedModuleId) {
        this.selectFirstModule();
      }
    }
  }

  private initializeModuleProgress(): void {
    if (this.course?.modules) {
      this.course.modules.forEach(module => {
        if (!this.moduleProgress.has(module.id)) {
          const randomProgress = Math.floor(Math.random() * 100);
          this.moduleProgress.set(module.id, randomProgress);
        }
      });
    }
  }

  private selectFirstModule(): void {
    if (this.course?.modules && this.course.modules.length > 0 && !this.selectedModuleId) {
      this.selectedModuleId = this.course.modules[0].id;
    }
  }

  getModuleProgress(moduleId: string): number {
    return this.moduleProgress.get(moduleId) || 0;
  }

  getProgressDashArray(moduleId: string): string {
    const circumference = 2 * Math.PI * 12;
    return `${circumference} ${circumference}`;
  }

  getProgressDashOffset(moduleId: string): number {
    const percentage = this.getModuleProgress(moduleId);
    const circumference = 2 * Math.PI * 12;
    return circumference - (percentage / 100) * circumference;
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

  onModuleSelected(moduleId: string) {
    this.selectedModuleId = moduleId;
  }

  isModuleSelected(moduleId: string): boolean {
    return this.selectedModuleId === moduleId;
  }

  getSelectedModuleArticles(): LearningArticleWithModule[] {
    if (!this.selectedModuleId) {
      return [];
    }
    return this.articlesByModule[this.selectedModuleId] || [];
  }

  getSelectedModule(): LearningModule | null {
    if (!this.selectedModuleId || !this.course) {
      return null;
    }
    return this.course.modules.find(m => m.id === this.selectedModuleId) || null;
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
