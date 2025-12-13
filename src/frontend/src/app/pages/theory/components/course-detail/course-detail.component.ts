import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LearningCourse, LearningModule } from '../../models/learning-course.model';
import { LearningArticle, LearningArticleWithModule } from '../../models/learning-article.model';
import { LearningCourseService } from '../../service/learning-course.service';
import { LearningArticleService } from '../../service/learning-article.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule, RouterModule],
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
  private loadFromRoute = false;

  constructor(
    @Optional() private route: ActivatedRoute,
    @Optional() private router: Router,
    @Optional() private learningCourseService: LearningCourseService,
    @Optional() private learningArticleService: LearningArticleService
  ) { }

  ngOnInit(): void {
    if (this.route && this.learningCourseService && this.learningArticleService) {
      this.loadFromRoute = true;
      this.route.params.subscribe(params => {
        const courseId = params['courseId'];
        if (courseId) {
          this.loadCourseAndArticles(courseId);
        }
      });
    } else {
      this.initializeModuleProgress();
      this.selectFirstModule();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.loadFromRoute) {
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
  }

  private loadCourseAndArticles(courseId: string): void {
    this.loading = true;
    this.error = null;

    if (!this.learningCourseService || !this.learningArticleService) {
      return;
    }

    this.learningCourseService.getCourseById(courseId).subscribe({
      next: (course) => {
        this.course = course;
        this.initializeModuleProgress();
        this.selectFirstModule();
        this.loadArticlesForCourse(course);
      },
      error: (error) => {
        this.error = 'Курс не найден.';
        this.loading = false;
        console.error('Error loading course:', error);
      }
    });
  }

  private loadArticlesForCourse(course: LearningCourse): void {
    if (!this.learningArticleService) {
      this.loading = false;
      return;
    }

    this.articlesByModule = {};

    const articleObservables = course.modules.map(module =>
      this.learningArticleService!.getArticlesByModuleId(module.id).pipe(
        map(articles => ({
          moduleId: module.id,
          articles: articles.map(article => ({
            article,
            moduleTitle: module.title || '',
            moduleDescription: module.description || ''
          }))
        })),
        catchError(error => {
          console.error(`Error loading articles for module ${module.id}:`, error);
          return of({ moduleId: module.id, articles: [] });
        })
      )
    );

    if (articleObservables.length === 0) {
      this.loading = false;
      return;
    }

    forkJoin(articleObservables).subscribe({
      next: (results) => {
        results.forEach(result => {
          this.articlesByModule[result.moduleId] = result.articles;
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading articles:', error);
        this.loading = false;
      }
    });
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
    if (this.loadFromRoute && this.router) {
      this.router.navigate(['/theory']);
    } else {
      this.goBack.emit();
    }
  }

  onArticleSelected(article: LearningArticle, module: LearningModule) {
    if (this.loadFromRoute && this.router && this.course) {
      this.router.navigate(['/theory/course', this.course.id, 'article', article.id]);
    } else {
      this.articleSelected.emit({ article, module });
    }
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
    if (this.loadFromRoute && this.route) {
      this.route.params.subscribe(params => {
        const courseId = params['courseId'];
        if (courseId) {
          this.loadCourseAndArticles(courseId);
        }
      });
    } else {
      this.retryLoad.emit();
    }
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
