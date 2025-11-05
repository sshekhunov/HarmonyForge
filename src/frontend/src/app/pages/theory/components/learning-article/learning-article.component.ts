import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { OsmdRendererModule } from '@/shared/components/osmd-renderer/osmd-renderer.module';
import { LearningArticle, LearningArticleContentSection, LearningArticleContentItem } from '../../models/learning-article.model';

@Component({
  selector: 'app-learning-article',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, DividerModule, OsmdRendererModule],
  templateUrl: './learning-article.component.html',
  styleUrls: ['./learning-article.component.scss']
})
export class LearningArticleComponent implements OnInit {
  @Input() article: LearningArticle | null = null;
  @Input() moduleTitle: string = '';
  @Input() moduleDescription: string = '';

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
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

  downloadMusicXml(content: string, sectionTitle?: string, order?: number): void {
    try {
      const blob = new Blob([content], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;

      let fileName: string;
      if (sectionTitle) {
        const sanitizedTitle = sectionTitle.replace(/[^a-zа-яё0-9]/gi, '_').toLowerCase();
        if (order !== undefined && order !== null) {
          fileName = `${sanitizedTitle}_${order}.musicxml`;
        } else {
          fileName = `${sanitizedTitle}.musicxml`;
        }
      } else {
        if (order !== undefined && order !== null) {
          fileName = `music_score_${order}.musicxml`;
        } else {
          fileName = 'music_score.musicxml';
        }
      }

      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading MusicXML file:', error);
    }
  }
}
