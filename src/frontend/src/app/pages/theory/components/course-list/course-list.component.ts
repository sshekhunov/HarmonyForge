import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, Optional, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LearningCourse, LearningModule } from '../../models/learning-course.model';
import { CourseCardComponent } from '../course-card/course-card.component';
import { LearningArticleService } from '../../service/learning-article.service';
import { StudentProfileService } from '../../service/student-profile.service';
import { AuthStateService } from '../../../../shared/services/auth-state.service';

interface CourseProgress {
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
}

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule, CourseCardComponent],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss']
})
export class CourseListComponent implements OnInit, OnChanges {
  @Input() courses: LearningCourse[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  
  @Output() courseSelected = new EventEmitter<LearningCourse>();
  @Output() retryLoad = new EventEmitter<void>();

  courseProgress: Map<string, CourseProgress> = new Map();
  isAuthenticated = false;

  constructor(
    @Optional() private learningArticleService: LearningArticleService,
    @Optional() private studentProfileService: StudentProfileService,
    @Optional() private authStateService: AuthStateService
  ) {
    if (this.authStateService) {
      this.isAuthenticated = this.authStateService.getIsAuthenticated();
      effect(() => {
        const isAuth = this.authStateService.isAuthenticatedSignal();
        this.isAuthenticated = isAuth;
        if (this.courses.length > 0) {
          if (isAuth) {
            this.loadCourseProgress();
          } else {
            this.loadCourseItemCounts();
          }
        }
      });
    }
  }

  ngOnInit(): void {
    if (this.courses.length > 0) {
      if (this.isAuthenticated) {
        this.loadCourseProgress();
      } else {
        this.loadCourseItemCounts();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['courses'] && this.courses.length > 0) {
      if (this.isAuthenticated) {
        this.loadCourseProgress();
      } else {
        this.loadCourseItemCounts();
      }
    }
  }

  onCourseSelected(course: LearningCourse) {
    this.courseSelected.emit(course);
  }

  onRetryLoad() {
    this.retryLoad.emit();
  }

  getModuleNumber(module: LearningModule): number {
    return module.number || 0;
  }

  trackByCourseId(index: number, course: LearningCourse): string {
    return course.id;
  }

  trackByModuleId(index: number, module: any): string {
    return module.id;
  }

  private loadCourseProgress(): void {
    if (!this.learningArticleService || !this.studentProfileService || !this.authStateService) {
      return;
    }

    const user = this.authStateService.getUser();
    if (!user || !user.userId) {
      return;
    }

    this.courses.forEach(course => {
      this.loadProgressForCourse(course, user.userId);
    });
  }

  private loadProgressForCourse(course: LearningCourse, userId: string): void {
    if (!this.learningArticleService || !this.studentProfileService) {
      return;
    }

    const articleObservables = course.modules.map(module =>
      this.learningArticleService!.getArticlesByModuleId(module.id).pipe(
        catchError(error => {
          console.error(`Error loading articles for module ${module.id}:`, error);
          return of([]);
        })
      )
    );

    if (articleObservables.length === 0) {
      this.courseProgress.set(course.id, {
        totalItems: 0,
        completedItems: 0,
        completionPercentage: 0
      });
      return;
    }

    forkJoin(articleObservables).subscribe({
      next: (articlesArrays) => {
        const allArticleIds: string[] = [];
        articlesArrays.forEach(articles => {
          articles.forEach(article => {
            allArticleIds.push(article.id);
          });
        });

        if (allArticleIds.length === 0) {
          this.courseProgress.set(course.id, {
            totalItems: 0,
            completedItems: 0,
            completionPercentage: 0
          });
          return;
        }

        this.studentProfileService.getLearningItemStatuses({
          userId: userId,
          learningItemIds: allArticleIds,
          learningItemType: 'Article'
        }).subscribe({
          next: (statuses) => {
            const completedCount = statuses.filter(status => status.isCompleted).length;
            const completionPercentage = allArticleIds.length > 0
              ? Math.round((completedCount / allArticleIds.length) * 100)
              : 0;

            this.courseProgress.set(course.id, {
              totalItems: allArticleIds.length,
              completedItems: completedCount,
              completionPercentage: completionPercentage
            });
          },
          error: (error) => {
            console.error('Error loading completion statuses:', error);
            this.courseProgress.set(course.id, {
              totalItems: allArticleIds.length,
              completedItems: 0,
              completionPercentage: 0
            });
          }
        });
      },
      error: (error) => {
        console.error('Error loading articles for course:', error);
        this.courseProgress.set(course.id, {
          totalItems: 0,
          completedItems: 0,
          completionPercentage: 0
        });
      }
    });
  }

  private loadCourseItemCounts(): void {
    if (!this.learningArticleService) {
      return;
    }

    this.courses.forEach(course => {
      this.loadItemCountForCourse(course);
    });
  }

  private loadItemCountForCourse(course: LearningCourse): void {
    if (!this.learningArticleService) {
      return;
    }

    const articleObservables = course.modules.map(module =>
      this.learningArticleService!.getArticlesByModuleId(module.id).pipe(
        catchError(error => {
          console.error(`Error loading articles for module ${module.id}:`, error);
          return of([]);
        })
      )
    );

    if (articleObservables.length === 0) {
      this.courseProgress.set(course.id, {
        totalItems: 0,
        completedItems: 0,
        completionPercentage: 0
      });
      return;
    }

    forkJoin(articleObservables).subscribe({
      next: (articlesArrays) => {
        const totalItems = articlesArrays.reduce((sum, articles) => sum + articles.length, 0);
        this.courseProgress.set(course.id, {
          totalItems: totalItems,
          completedItems: 0,
          completionPercentage: 0
        });
      },
      error: (error) => {
        console.error('Error loading articles for course:', error);
        this.courseProgress.set(course.id, {
          totalItems: 0,
          completedItems: 0,
          completionPercentage: 0
        });
      }
    });
  }

  getCourseProgress(courseId: string): CourseProgress {
    return this.courseProgress.get(courseId) || {
      totalItems: 0,
      completedItems: 0,
      completionPercentage: 0
    };
  }
}
