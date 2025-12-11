import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningCourse } from '../../models/learning-course.model';

@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-card.component.html',
  styleUrls: ['./course-card.component.scss']
})
export class CourseCardComponent {
  @Input() course!: LearningCourse;
  @Output() courseSelected = new EventEmitter<LearningCourse>();

  getModuleCount(): number {
    return this.course?.modules?.length || 0;
  }

  getItemCount(): number {
    return 0;
  }

  getCompletionPercentage(): number {
    return 60;
  }

  getProgressDashArray(): string {
    const circumference = 2 * Math.PI * 16;
    return `${circumference} ${circumference}`;
  }

  getProgressDashOffset(): number {
    const percentage = this.getCompletionPercentage();
    const circumference = 2 * Math.PI * 16;
    return circumference - (percentage / 100) * circumference;
  }

  onCardClick(): void {

  }

  onPlayButtonClick(event: Event): void {
    event.stopPropagation();
    this.courseSelected.emit(this.course);
  }
}

