import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { LearningCourseService } from './service/learning-course.service';
import { LearningCourse } from './models/learning-course.model';

@Component({
    selector: 'app-theory',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, TagModule, ProgressSpinnerModule, TooltipModule],
    templateUrl: './theory.component.html',
    styleUrls: ['./theory.component.scss']
})
export class TheoryComponent implements OnInit {
    courses: LearningCourse[] = [];
    loading = false;
    error: string | null = null;

    constructor(private learningCourseService: LearningCourseService) {}

    ngOnInit() {
        this.loadCourses();
    }

    loadCourses() {
        this.loading = true;
        this.error = null;
        
        this.learningCourseService.getAllCourses().subscribe({
            next: (courses) => {
                this.courses = courses;
                this.loading = false;
            },
            error: (error) => {
                this.error = 'Failed to load courses. Please try again later.';
                this.loading = false;
                console.error('Error loading courses:', error);
            }
        });
    }

    startCourse(course: LearningCourse) {
        console.log('Starting course:', course.title);
    }

    getModuleCount(course: LearningCourse): number {
        return course.modules?.length || 0;
    }

    getTotalItems(course: LearningCourse): number {
        return course.modules?.reduce((total, module) => total + (module.items?.length || 0), 0) || 0;
    }

    getModuleTypeIcon(type: number): string {
        switch (type) {
            case 0: return 'pi-book';
            case 1: return 'pi-pencil';
            case 2: return 'pi-question-circle';
            default: return 'pi-file';
        }
    }

    getModuleTypeLabel(type: number): string {
        switch (type) {
            case 0: return 'Article';
            case 1: return 'Exercise';
            case 2: return 'Test';
            default: return 'Unknown';
        }
    }

    getCourseDifficulty(course: LearningCourse): string {
        const totalItems = this.getTotalItems(course);
        if (totalItems <= 5) return 'Beginner';
        if (totalItems <= 15) return 'Intermediate';
        return 'Advanced';
    }

    getEstimatedDuration(course: LearningCourse): string {
        const totalItems = this.getTotalItems(course);
        const estimatedMinutes = totalItems * 5; // 5 minutes per item
        if (estimatedMinutes < 60) return `${estimatedMinutes} min`;
        const hours = Math.floor(estimatedMinutes / 60);
        const minutes = estimatedMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
}
