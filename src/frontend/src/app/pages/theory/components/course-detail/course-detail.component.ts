import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, Optional, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';
import { LearningCourse, LearningModule } from '../../models/learning-course.model';
import { LearningArticle, LearningArticleWithModule } from '../../models/learning-article.model';
import { LearningExercise, LearningExerciseWithModule } from '../../models/learning-exercise.model';
import { LearningCourseService } from '../../service/learning-course.service';
import { LearningArticleService } from '../../service/learning-article.service';
import { LearningExerciseService } from '../../service/learning-exercise.service';
import { StudentProfileService } from '../../service/student-profile.service';
import { AuthStateService } from '../../../../shared/services/auth-state.service';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule, RouterModule, CheckboxModule],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss']
})
export class CourseDetailComponent implements OnInit, OnChanges {
  @Input() course: LearningCourse | null = null;
  @Input() articlesByModule: { [moduleId: string]: LearningArticleWithModule[] } = {};
  @Input() exercisesByModule: { [moduleId: string]: LearningExerciseWithModule[] } = {};
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() expandedModules: Set<string> = new Set();

  @Output() goBack = new EventEmitter<void>();
  @Output() articleSelected = new EventEmitter<{article: LearningArticle, module: LearningModule}>();
  @Output() moduleToggled = new EventEmitter<string>();
  @Output() retryLoad = new EventEmitter<void>();

  selectedModuleId: string | null = null;
  moduleProgress: Map<string, number> = new Map();
  articleCompletionStatus: Map<string, boolean> = new Map();
  exerciseScores: Map<string, number> = new Map(); // Map<exerciseId, scorePercentage>
  isAuthenticated = false;
  private loadFromRoute = false;

  constructor(
    @Optional() private route: ActivatedRoute,
    @Optional() private router: Router,
    @Optional() private learningCourseService: LearningCourseService,
    @Optional() private learningArticleService: LearningArticleService,
    @Optional() private learningExerciseService: LearningExerciseService,
    @Optional() private studentProfileService: StudentProfileService,
    @Optional() private authStateService: AuthStateService
  ) {
    if (this.authStateService) {
      this.isAuthenticated = this.authStateService.getIsAuthenticated();
      effect(() => {
        const isAuth = this.authStateService.isAuthenticatedSignal();
        this.isAuthenticated = isAuth;
        if (isAuth && this.course) {
          this.loadArticleCompletionStatuses();
          this.loadExerciseScores();
        } else {
          this.articleCompletionStatus.clear();
          this.exerciseScores.clear();
          this.initializeModuleProgress();
        }
      });
    }
  }

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
          if (this.isAuthenticated) {
            this.loadArticleCompletionStatuses();
            this.loadExerciseScores();
          }
        } else if (!this.selectedModuleId) {
          this.selectFirstModule();
        }
      }
      if (changes['articlesByModule']) {
        this.initializeModuleProgress();
        if (this.isAuthenticated) {
          this.loadArticleCompletionStatuses();
          this.loadExerciseScores();
        }
      }
      if (changes['exercisesByModule']) {
        if (this.isAuthenticated) {
          this.loadExerciseScores();
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
        this.loadExercisesForCourse(course);
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
        this.initializeModuleProgress();
        this.loading = false;
        if (this.isAuthenticated) {
          this.loadArticleCompletionStatuses();
          this.loadExerciseScores();
        }
      },
      error: (error) => {
        console.error('Error loading articles:', error);
        this.loading = false;
      }
    });
  }

  private loadExercisesForCourse(course: LearningCourse): void {
    if (!this.learningExerciseService) {
      return;
    }

    this.exercisesByModule = {};

    const exerciseObservables = course.modules.map(module =>
      this.learningExerciseService!.getExercisesByModuleId(module.id).pipe(
        map(exercises => ({
          moduleId: module.id,
          exercises: exercises.map(exercise => ({
            exercise,
            moduleTitle: module.title || '',
            moduleDescription: module.description || ''
          }))
        })),
        catchError(error => {
          console.error(`Error loading exercises for module ${module.id}:`, error);
          return of({ moduleId: module.id, exercises: [] });
        })
      )
    );

    if (exerciseObservables.length === 0) {
      return;
    }

    forkJoin(exerciseObservables).subscribe({
      next: (results) => {
        results.forEach(result => {
          this.exercisesByModule[result.moduleId] = result.exercises;
        });
        if (this.isAuthenticated) {
          this.loadExerciseScores();
        }
      },
      error: (error) => {
        console.error('Error loading exercises:', error);
      }
    });
  }

  private initializeModuleProgress(): void {
    if (this.course?.modules) {
      this.course.modules.forEach(module => {
        this.calculateModuleProgress(module.id);
      });
    }
  }

  private calculateModuleProgress(moduleId: string): void {
    const articles = this.articlesByModule[moduleId] || [];
    if (articles.length === 0) {
      this.moduleProgress.set(moduleId, 0);
      return;
    }

    const completedCount = articles.filter(articleWithModule => 
      this.articleCompletionStatus.get(articleWithModule.article.id) === true
    ).length;

    const progress = Math.round((completedCount / articles.length) * 100);
    this.moduleProgress.set(moduleId, progress);
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

  getSelectedModuleExercises(): LearningExerciseWithModule[] {
    if (!this.selectedModuleId) {
      return [];
    }
    return this.exercisesByModule[this.selectedModuleId] || [];
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

  trackByExerciseId(index: number, exerciseWithModule: LearningExerciseWithModule): string {
    return exerciseWithModule.exercise.id;
  }

  getExerciseTitle(exercise: LearningExercise): string {
    return exercise.title || 'Упражнение';
  }

  getExerciseDescription(exercise: LearningExercise): string {
    return exercise.description || 'Описание упражнения недоступно';
  }

  getExerciseScore(exerciseId: string): number {
    return this.exerciseScores.get(exerciseId) || 0;
  }

  isExerciseCompleted(exerciseId: string): boolean {
    const score = this.exerciseScores.get(exerciseId);
    return score !== undefined && score > 0;
  }

  private loadArticleCompletionStatuses(): void {
    if (!this.studentProfileService || !this.authStateService) {
      return;
    }

    const user = this.authStateService.getUser();
    if (!user || !user.userId) {
      return;
    }

    const allArticleIds: string[] = [];
    Object.values(this.articlesByModule).forEach(articles => {
      articles.forEach(articleWithModule => {
        allArticleIds.push(articleWithModule.article.id);
      });
    });

    if (allArticleIds.length === 0) {
      return;
    }

    this.studentProfileService.getLearningItemStatuses({
      userId: user.userId,
      learningItemIds: allArticleIds,
      learningItemType: 'Article'
    }).subscribe({
      next: (statuses:any) => {
        statuses.forEach((status: any) => {
          this.articleCompletionStatus.set(status.learningItemId, status.isCompleted);
        });
        this.updateAllModuleProgress();
      },
      error: (error: any) => {
        console.error('Error loading article completion statuses:', error);
      }
    });
  }

  isArticleCompleted(articleId: string): boolean {
    return this.articleCompletionStatus.get(articleId) || false;
  }

  onArticleCompletionChange(articleId: string, isCompleted: boolean): void {
    if (!this.studentProfileService || !this.authStateService) {
      return;
    }

    const user = this.authStateService.getUser();
    if (!user || !user.userId) {
      return;
    }

    this.articleCompletionStatus.set(articleId, isCompleted);

    const moduleId = this.findModuleIdForArticle(articleId);
    if (moduleId) {
      this.calculateModuleProgress(moduleId);
    }

    this.studentProfileService.updateLearningItemStatus({
      userId: user.userId,
      learningItemId: articleId,
      learningItemType: 'Article',
      isCompleted: isCompleted
    }).subscribe({
      next: () => {
      },
      error: (error:any) => {
        console.error('Error updating article completion status:', error);
        this.articleCompletionStatus.set(articleId, !isCompleted);
        if (moduleId) {
          this.calculateModuleProgress(moduleId);
        }
      }
    });
  }

  private findModuleIdForArticle(articleId: string): string | null {
    for (const [moduleId, articles] of Object.entries(this.articlesByModule)) {
      if (articles.some(articleWithModule => articleWithModule.article.id === articleId)) {
        return moduleId;
      }
    }
    return null;
  }

  private updateAllModuleProgress(): void {
    if (this.course?.modules) {
      this.course.modules.forEach(module => {
        this.calculateModuleProgress(module.id);
      });
    }
  }

  private loadExerciseScores(): void {
    if (!this.studentProfileService || !this.authStateService) {
      return;
    }

    const user = this.authStateService.getUser();
    if (!user || !user.userId) {
      return;
    }

    const allExerciseIds: string[] = [];
    Object.values(this.exercisesByModule).forEach(exercises => {
      exercises.forEach(exerciseWithModule => {
        allExerciseIds.push(exerciseWithModule.exercise.id);
      });
    });

    if (allExerciseIds.length === 0) {
      return;
    }

    this.studentProfileService.getLearningItemStatuses({
      userId: user.userId,
      learningItemIds: allExerciseIds,
      learningItemType: 'Excercise'
    }).subscribe({
      next: (statuses: any) => {
        statuses.forEach((status: any) => {
          // Convert score to percentage (assuming score is 0-1 or 0-100)
          const score = status.score ?? 0;
          const scorePercentage = score <= 1 ? Math.round(score * 100) : Math.round(score);
          this.exerciseScores.set(status.learningItemId, scorePercentage);
        });
      },
      error: (error: any) => {
        console.error('Error loading exercise scores:', error);
      }
    });
  }
}
