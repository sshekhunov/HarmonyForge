import { Component, Input, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { OsmdRendererModule } from '@/shared/components/osmd-renderer/osmd-renderer.module';
import { LearningArticle, LearningArticleContentSection, LearningArticleContentItem } from '../../models/learning-article.model';
import { LearningCourseService } from '../../service/learning-course.service';
import { LearningArticleService } from '../../service/learning-article.service';
import { StudentProfileService } from '../../service/student-profile.service';
import { AuthStateService } from '../../../../shared/services/auth-state.service';

@Component({
  selector: 'app-learning-article',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, DividerModule, ProgressSpinnerModule, OsmdRendererModule, RouterModule],
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
    private sanitizer: DomSanitizer,
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

  isVideoContent(content: string): boolean {
    return content.includes('youtube.com') ||
           content.includes('youtu.be') ||
           content.includes('vimeo.com') ||
           content.includes('youtube-nocookie.com');
  }

  getVideoEmbedUrl(url: string): SafeResourceUrl {
    let embedUrl: string;

    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtube.com/embed/')) {
      // Already an embed URL
      embedUrl = url;
    } else if (url.includes('youtube-nocookie.com/embed/')) {
      // Already a nocookie embed URL
      embedUrl = url;
    } else if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1].split('?')[0];
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    } else {
      embedUrl = url;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  trackBySectionOrder(index: number, section: LearningArticleContentSection): number {
    return section.order;
  }

  trackByContentItemOrder(index: number, item: LearningArticleContentItem): number {
    return item.order;
  }

  getPartName(sectionTitle?: string, order?: number): string {
    if (sectionTitle) {
      const sanitizedTitle = sectionTitle.replace(/[^a-zа-яё0-9]/gi, '_').toLowerCase();
      if (order !== undefined && order !== null) {
        return `${sanitizedTitle}_${order}`;
      } else {
        return sanitizedTitle;
      }
    } else {
      if (order !== undefined && order !== null) {
        return `music_score_${order}`;
      } else {
        return 'music_score';
      }
    }
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
