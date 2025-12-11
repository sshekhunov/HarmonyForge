import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { LearningCourseService } from './service/learning-course.service';
import { LearningCourse } from './models/learning-course.model';
import { CourseListComponent } from './components/course-list/course-list.component';

@Component({
    selector: 'app-theory',
    standalone: true,
    imports: [CommonModule, ButtonModule, RouterModule, CourseListComponent],
    templateUrl: './theory.component.html',
    styleUrls: ['./theory.component.scss']
})
export class TheoryComponent implements OnInit {
    courses: LearningCourse[] = [];
    loading = false;
    error: string | null = null;

    constructor(
        private learningCourseService: LearningCourseService,
        private router: Router
    ) {}

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
                this.error = 'Не удалось загрузить курсы. Пожалуйста, попробуйте позже.';
                this.loading = false;
                console.error('Error loading courses:', error);
            }
        });
    }

    startCourse(course: LearningCourse) {
        this.router.navigate(['/theory/course', course.id]);
    }
}
