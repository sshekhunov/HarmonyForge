import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LearningCourse, LearningModule } from '../../models/learning-course.model';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss']
})
export class CourseListComponent implements OnInit {
  @Input() courses: LearningCourse[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  
  @Output() courseSelected = new EventEmitter<LearningCourse>();
  @Output() retryLoad = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

  onCourseSelected(course: LearningCourse) {
    this.courseSelected.emit(course);
  }

  onRetryLoad() {
    this.retryLoad.emit();
  }

  getModuleCount(course: LearningCourse): number {
    return course.modules?.length || 0;
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
}
