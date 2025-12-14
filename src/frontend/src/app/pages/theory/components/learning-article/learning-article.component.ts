import { Component, Input, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LearningArticle, LearningArticleContentSection } from '../../models/learning-article.model';
import { LearningContentRendererComponent } from '../../../../shared/components/learning-content-renderer/learning-content-renderer.component';
import { LearningCourseService } from '../../service/learning-course.service';
import { LearningArticleService } from '../../service/learning-article.service';
import { StudentProfileService } from '../../service/student-profile.service';
import { AuthStateService } from '../../../../shared/services/auth-state.service';

@Component({
  selector: 'app-learning-article',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, DividerModule, ProgressSpinnerModule, RouterModule, LearningContentRendererComponent],
  templateUrl: './learning-article.component.html',
  styleUrls: ['./learning-article.component.scss']
})
export class LearningArticleComponent implements OnInit {
  @Input() article: LearningArticle | null = null;
  @Input() moduleTitle: string = '';
  @Input() moduleDescription: string = '';
  @Input() loading: boolean = false;

  loadFromRoute = false;
  courseId: string | null = null;

  constructor(
    @Optional() private route: ActivatedRoute,
    @Optional() private router: Router,
    @Optional() private learningCourseService: LearningCourseService,
    @Optional() private learningArticleService: LearningArticleService,
    @Optional() private studentProfileService: StudentProfileService,
    @Optional() private authStateService: AuthStateService
  ) { }

  ngOnInit(): void {
    if (this.route && this.learningArticleService && this.learningCourseService) {
      this.loadFromRoute = true;
      this.route.params.subscribe(params => {
        this.courseId = params['courseId'] || null;
        const articleId = params['articleId'];
        if (articleId) {
          this.loadArticle(articleId);
        }
      });
    }
  }

  private loadArticle(articleId: string): void {
    if (!this.learningArticleService || !this.learningCourseService) {
      return;
    }

    this.loading = true;

    this.learningArticleService.getArticleById(articleId).subscribe({
      next: (article) => {
        this.article = article;
        this.updateArticleCompletionStatus(article.id, true);
        if (this.courseId) {
          this.loadCourseForModule(article.learningModuleId);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading article:', error);
      }
    });
  }

  private loadCourseForModule(moduleId: string): void {
    if (!this.courseId || !this.learningCourseService) {
      this.loading = false;
      return;
    }

    this.learningCourseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        const module = course.modules.find(m => m.id === moduleId);
        if (module) {
          this.moduleTitle = module.title || '';
          this.moduleDescription = module.description || '';
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading course:', error);
      }
    });
  }

  onGoBack(): void {
    if (this.loadFromRoute && this.router) {
      if (this.courseId) {
        this.router.navigate(['/theory/course', this.courseId]);
      } else {
        this.router.navigate(['/theory']);
      }
    }
  }

  trackBySectionOrder(index: number, section: LearningArticleContentSection): number {
    return section.order;
  }

  private updateArticleCompletionStatus(articleId: string, isCompleted: boolean): void {
    const user = this.authStateService.getUser();
    if (!user || !user.userId) {
      return;
    }

    this.studentProfileService.updateLearningItemStatus({
      userId: user.userId,
      learningItemId: articleId,
      learningItemType: 'Article',
      isCompleted: isCompleted
    }).subscribe({
      next: () => {
      },
      error: (error) => {
        console.error('Error updating article completion status:', error);
      }
    });
  }
}
