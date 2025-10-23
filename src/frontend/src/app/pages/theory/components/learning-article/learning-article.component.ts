import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { LearningArticle, LearningArticleContentSection, LearningArticleContentItem } from '../../models/learning-article.model';

@Component({
  selector: 'app-learning-article',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, DividerModule],
  templateUrl: './learning-article.component.html',
  styleUrls: ['./learning-article.component.scss']
})
export class LearningArticleComponent implements OnInit {
  @Input() article: LearningArticle | null = null;
  @Input() moduleTitle: string = '';
  @Input() moduleDescription: string = '';

  constructor() { }

  ngOnInit(): void {
  }

  isVideoContent(content: string): boolean {
    return content.includes('youtube.com') || content.includes('youtu.be') || content.includes('vimeo.com');
  }

  getVideoEmbedUrl(url: string): string {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  }

  trackBySectionOrder(index: number, section: LearningArticleContentSection): number {
    return section.order;
  }

  trackByContentItemOrder(index: number, item: LearningArticleContentItem): number {
    return item.order;
  }
}
