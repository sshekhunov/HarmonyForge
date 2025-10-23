import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { LearningCourseService } from './service/learning-course.service';
import { LearningArticleService } from './service/learning-article.service';
import { LearningCourse, LearningModule } from './models/learning-course.model';
import { LearningArticle, LearningArticleWithModule } from './models/learning-article.model';
import { LearningArticleComponent } from './components/learning-article/learning-article.component';
import { CourseListComponent } from './components/course-list/course-list.component';
import { CourseDetailComponent } from './components/course-detail/course-detail.component';

@Component({
    selector: 'app-theory',
    standalone: true,
    imports: [CommonModule, ButtonModule, LearningArticleComponent, CourseListComponent, CourseDetailComponent],
    templateUrl: './theory.component.html',
    styleUrls: ['./theory.component.scss']
})
export class TheoryComponent implements OnInit {
    courses: LearningCourse[] = [];
    loading = false;
    error: string | null = null;

    // Articles view state
    showArticles = false;
    selectedCourse: LearningCourse | null = null;
    articlesByModule: { [moduleId: string]: LearningArticleWithModule[] } = {};
    articlesLoading = false;
    articlesError: string | null = null;
    expandedModules: Set<string> = new Set(); // Track which modules are expanded

    // Article detail view state
    showArticleDetail = false;
    selectedArticle: LearningArticle | null = null;
    selectedModule: LearningModule | null = null;

    constructor(
        private learningCourseService: LearningCourseService,
        private learningArticleService: LearningArticleService
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
        this.selectedCourse = course;
        this.showArticles = true;
        this.loadArticlesForCourse(course);
    }

    loadArticlesForCourse(course: LearningCourse) {
        this.articlesLoading = true;
        this.articlesError = null;
        this.articlesByModule = {};

        // Load all articles and group them by module
        this.learningArticleService.getAllArticles().subscribe({
            next: (articles) => {
                // Group articles by module ID
                course.modules.forEach(module => {
                    const moduleArticles = articles.filter(article => article.learningModuleId === module.id);
                    const articlesWithModule: LearningArticleWithModule[] = moduleArticles.map(article => ({
                        article: article,
                        moduleTitle: module.title,
                        moduleDescription: module.description
                    }));
                    this.articlesByModule[module.id] = articlesWithModule;
                });
                this.articlesLoading = false;
                // Set first module as expanded by default
                if (course.modules.length > 0) {
                    this.expandedModules.add(course.modules[0].id);
                }
            },
            error: (error) => {
                this.articlesError = 'Не удалось загрузить статьи. Пожалуйста, попробуйте позже.';
                this.articlesLoading = false;
                console.error('Error loading articles:', error);
            }
        });
    }

    goBackToCourses() {
        this.showArticles = false;
        this.showArticleDetail = false;
        this.selectedCourse = null;
        this.selectedArticle = null;
        this.selectedModule = null;
        this.articlesByModule = {};
        this.expandedModules.clear();
    }

    goBackToArticles() {
        this.showArticleDetail = false;
        this.selectedArticle = null;
        this.selectedModule = null;
    }

    openArticle(article: LearningArticle, module: LearningModule) {
        this.selectedArticle = article;
        this.selectedModule = module;
        this.showArticleDetail = true;
    }

    toggleModule(moduleId: string) {
        if (this.expandedModules.has(moduleId)) {
            this.expandedModules.delete(moduleId);
        } else {
            this.expandedModules.add(moduleId);
        }
    }

    trackByContentSection(index: number, section: any): number {
        return section.order;
    }

    trackByContentItem(index: number, contentItem: any): number {
        return contentItem.order;
    }
}
