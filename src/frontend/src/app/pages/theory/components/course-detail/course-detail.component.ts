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
import { LearningArticle } from '../../models/learning-article.model';
import { LearningItem, LearningItemWithModule, LearningItemType } from '../../models/learning-item.model';
import { LearningCourseService } from '../../service/learning-course.service';
import { LearningItemService } from '../../service/learning-item.service';
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
  @Input() itemsByModule: { [moduleId: string]: LearningItemWithModule[] } = {};
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() expandedModules: Set<string> = new Set();

  @Output() goBack = new EventEmitter<void>();
  @Output() articleSelected = new EventEmitter<{article: LearningArticle, module: LearningModule}>();
  @Output() moduleToggled = new EventEmitter<string>();
  @Output() retryLoad = new EventEmitter<void>();

  selectedModuleId: string | null = null;
  moduleProgress: Map<string, number> = new Map();
  itemStatuses: Map<string, { isCompleted: boolean; score?: number }> = new Map(); // Map<itemId, {isCompleted, score}>
  isAuthenticated = false;
  private loadFromRoute = false;

  constructor(
    @Optional() private route: ActivatedRoute,
    @Optional() private router: Router,
    @Optional() private learningCourseService: LearningCourseService,
    @Optional() private learningItemService: LearningItemService,
    @Optional() private studentProfileService: StudentProfileService,
    @Optional() private authStateService: AuthStateService
  ) {
    if (this.authStateService) {
      this.isAuthenticated = this.authStateService.getIsAuthenticated();
      effect(() => {
        const isAuth = this.authStateService.isAuthenticatedSignal();
        this.isAuthenticated = isAuth;
        if (isAuth && this.course) {
          this.loadItemStatuses();
        } else {
          this.itemStatuses.clear();
          this.initializeModuleProgress();
        }
      });
    }
  }

  ngOnInit(): void {
    if (this.route && this.learningCourseService && this.learningItemService) {
      this.loadFromRoute = true;
      this.route.params.subscribe(params => {
        const courseId = params['courseId'];
        if (courseId) {
          this.loadCourseAndItems(courseId);
        }
      });
    } else {
      this.initializeModuleProgress();
      this.selectDefaultModule();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.loadFromRoute) {
      if (changes['course'] && this.course) {
        this.initializeModuleProgress();
        const previousCourse = changes['course'].previousValue;
        if (!previousCourse || previousCourse.id !== this.course.id) {
          this.selectedModuleId = null;
          const savedModuleId = this.getSavedModuleId(this.course.id);
          if (savedModuleId && this.course.modules.some(m => m.id === savedModuleId)) {
            this.selectedModuleId = savedModuleId;
          } else {
            this.selectDefaultModule();
          }
          if (this.isAuthenticated) {
            this.loadItemStatuses();
          }
        } else if (!this.selectedModuleId) {
          this.selectDefaultModule();
        }
      }
      if (changes['itemsByModule']) {
        this.initializeModuleProgress();
        if (this.isAuthenticated) {
          this.loadItemStatuses();
        }
      }
    }
  }

  private loadCourseAndItems(courseId: string): void {
    this.loading = true;
    this.error = null;

    if (!this.learningCourseService || !this.learningItemService) {
      return;
    }

    this.learningCourseService.getCourseById(courseId).subscribe({
      next: (course) => {
        this.course = course;
        this.initializeModuleProgress();
        // Try to restore saved module ID before selecting
        const savedModuleId = this.getSavedModuleId(course.id);
        if (savedModuleId && course.modules.some(m => m.id === savedModuleId)) {
          this.selectedModuleId = savedModuleId;
        } else {
          this.selectDefaultModule();
        }
        this.loadItemsForCourse(course);
      },
      error: (error) => {
        this.error = 'Курс не найден.';
        this.loading = false;
        console.error('Error loading course:', error);
      }
    });
  }

  private loadItemsForCourse(course: LearningCourse): void {
    if (!this.learningItemService) {
      this.loading = false;
      return;
    }

    this.itemsByModule = {};

    const itemObservables = course.modules.map(module =>
      this.learningItemService!.getItemsByModuleId(module.id).pipe(
        map(items => ({
          moduleId: module.id,
          items: items.map(item => ({
            item,
            moduleTitle: module.title || '',
            moduleDescription: module.description || ''
          }))
        })),
        catchError(error => {
          console.error(`Error loading items for module ${module.id}:`, error);
          return of({ moduleId: module.id, items: [] });
        })
      )
    );

    if (itemObservables.length === 0) {
      this.loading = false;
      return;
    }

    forkJoin(itemObservables).subscribe({
      next: (results) => {
        results.forEach(result => {
          this.itemsByModule[result.moduleId] = result.items;
        });
        this.initializeModuleProgress();
        this.loading = false;
        if (this.isAuthenticated) {
          this.loadItemStatuses();
        }
      },
      error: (error) => {
        console.error('Error loading items:', error);
        this.loading = false;
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
    const items = this.itemsByModule[moduleId] || [];
    if (items.length === 0) {
      this.moduleProgress.set(moduleId, 0);
      return;
    }

    const completedCount = items.filter(itemWithModule => {
      const status = this.itemStatuses.get(itemWithModule.item.id);
      return status?.isCompleted === true;
    }).length;

    const progress = Math.round((completedCount / items.length) * 100);
    this.moduleProgress.set(moduleId, progress);
  }

  private selectDefaultModule(): void {
    if (this.course?.modules && this.course.modules.length > 0 && !this.selectedModuleId) {
      const savedModuleId = this.getSavedModuleId(this.course.id);

      if (savedModuleId && this.course.modules.some(m => m.id === savedModuleId)) {
        this.selectedModuleId = savedModuleId;
      } else {
        this.selectedModuleId = this.course.modules[0].id;
        this.saveModuleId(this.course.id, this.selectedModuleId);
      }
    }
  }

  private getSavedModuleId(courseId: string): string | null {
    try {
      const key = `selectedModule_${courseId}`;
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  }

  private saveModuleId(courseId: string, moduleId: string): void {
    try {
      const key = `selectedModule_${courseId}`;
      localStorage.setItem(key, moduleId);
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
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

  onItemSelected(item: LearningItem, module: LearningModule) {
    if (item.itemType === LearningItemType.Article) {
      // Create minimal article object for navigation (full article will be loaded by the article component)
      const article: LearningArticle = {
        id: item.id,
        learningModuleId: item.learningModuleId,
        title: item.title,
        description: item.description,
        number: item.number,
        contentSections: []
      };
        if (this.loadFromRoute && this.router && this.course) {
        this.router.navigate(['/theory/course', this.course.id, 'article', article.id]);
        } else {
        this.articleSelected.emit({ article, module });
        }
    } else if (item.itemType === LearningItemType.Exercise) {
      if (this.loadFromRoute && this.router && this.course) {
        this.router.navigate(['/theory/course', this.course.id, 'exercise', item.id]);
      }
    }
  }

  isArticle(item: LearningItem): boolean {
    return item.itemType === LearningItemType.Article;
  }

  isExercise(item: LearningItem): boolean {
    return item.itemType === LearningItemType.Exercise;
  }

  onModuleToggled(moduleId: string) {
    this.moduleToggled.emit(moduleId);
  }

  onModuleSelected(moduleId: string) {
    this.selectedModuleId = moduleId;
    if (this.course) {
      this.saveModuleId(this.course.id, moduleId);
    }
  }

  isModuleSelected(moduleId: string): boolean {
    return this.selectedModuleId === moduleId;
  }

  getSelectedModuleItems(): LearningItemWithModule[] {
    if (!this.selectedModuleId) {
      return [];
    }
    return this.itemsByModule[this.selectedModuleId] || [];
  }

  getSelectedModuleArticles(): LearningItemWithModule[] {
    return this.getSelectedModuleItems().filter(item => item.item.itemType === LearningItemType.Article);
  }

  getSelectedModuleExercises(): LearningItemWithModule[] {
    return this.getSelectedModuleItems().filter(item => item.item.itemType === LearningItemType.Exercise);
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
          this.loadCourseAndItems(courseId);
        }
      });
    } else {
      this.retryLoad.emit();
    }
  }

  getModulesWithItems() {
    if (!this.course) return [];

    return this.course.modules.map(module => ({
      ...module,
      items: this.itemsByModule[module.id] || []
    }));
  }

  isModuleExpanded(moduleId: string): boolean {
    return this.expandedModules.has(moduleId);
  }

  getModuleNumber(module: LearningModule): number {
    return module.number || 0;
  }

  getItemTitle(item: LearningItem): string {
    return item.title || (item.itemType === LearningItemType.Article ? 'Статья' : 'Упражнение');
  }

  getItemDescription(item: LearningItem): string {
    return item.description || 'Описание недоступно';
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

  trackByItemId(index: number, itemWithModule: LearningItemWithModule): string {
    return itemWithModule.item.id;
  }

  trackByArticleId(index: number, itemWithModule: LearningItemWithModule): string {
    return itemWithModule.item.id;
  }

  trackByExerciseId(index: number, itemWithModule: LearningItemWithModule): string {
    return itemWithModule.item.id;
  }

  getItemScore(itemId: string): number {
    const status = this.itemStatuses.get(itemId);
    if (!status?.score) return 0;
    // Convert score to percentage (assuming score is 0-1 or 0-100)
    return status.score <= 1 ? Math.round(status.score * 100) : Math.round(status.score);
  }

  isItemCompleted(itemId: string): boolean {
    const status = this.itemStatuses.get(itemId);
    return status?.isCompleted === true;
  }

  private loadItemStatuses(): void {
    if (!this.studentProfileService || !this.authStateService) {
      return;
    }

    const user = this.authStateService.getUser();
    if (!user || !user.userId) {
      return;
    }

    const allItems: Array<{ learningItemId: string; learningItemType: 'Article' | 'Excercise' | 'Test' }> = [];
    Object.values(this.itemsByModule).forEach(items => {
      items.forEach(itemWithModule => {
        allItems.push({
          learningItemId: itemWithModule.item.id,
          learningItemType: itemWithModule.item.itemType === LearningItemType.Article ? 'Article' : 'Excercise'
        });
      });
    });

    if (allItems.length === 0) {
      return;
    }

    this.studentProfileService.getLearningItemStatuses({
      userId: user.userId,
      items: allItems
    }).subscribe({
      next: (statuses: any) => {
        statuses.forEach((status: any) => {
          this.itemStatuses.set(status.learningItemId, {
            isCompleted: status.isCompleted,
            score: status.score
          });
        });
        this.updateAllModuleProgress();
      },
      error: (error: any) => {
        console.error('Error loading item statuses:', error);
      }
    });
  }

  isArticleCompleted(articleId: string): boolean {
    return this.isItemCompleted(articleId);
  }

  onArticleCompletionChange(articleId: string, isCompleted: boolean): void {
    if (!this.studentProfileService || !this.authStateService) {
      return;
    }

    const user = this.authStateService.getUser();
    if (!user || !user.userId) {
      return;
    }

    const currentStatus = this.itemStatuses.get(articleId) || { isCompleted: false };
    this.itemStatuses.set(articleId, { ...currentStatus, isCompleted });

    const moduleId = this.findModuleIdForItem(articleId);
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
        this.itemStatuses.set(articleId, { ...currentStatus, isCompleted: !isCompleted });
        if (moduleId) {
          this.calculateModuleProgress(moduleId);
        }
      }
    });
  }

  private findModuleIdForItem(itemId: string): string | null {
    for (const [moduleId, items] of Object.entries(this.itemsByModule)) {
      if (items.some(itemWithModule => itemWithModule.item.id === itemId)) {
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
}
