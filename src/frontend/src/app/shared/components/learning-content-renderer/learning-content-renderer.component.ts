import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OsmdRendererModule } from '../osmd-renderer/osmd-renderer.module';
import { LearningArticleContentItem } from '../../../pages/theory/models/learning-article.model';

@Component({
  selector: 'app-learning-content-renderer',
  standalone: true,
  imports: [CommonModule, OsmdRendererModule],
  templateUrl: './learning-content-renderer.component.html',
  styleUrls: ['./learning-content-renderer.component.scss']
})
export class LearningContentRendererComponent {
  @Input() contentItems: LearningArticleContentItem[] = [];
  @Input() sectionTitle?: string;

  constructor(private sanitizer: DomSanitizer) { }

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
}

