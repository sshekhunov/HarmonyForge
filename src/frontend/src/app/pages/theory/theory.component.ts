import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { LearningCourseService } from './service/learning-course.service';
import { LearningArticleService } from './service/learning-article.service';
import { LearningCourse } from './models/learning-course.model';
import { LearningArticle, LearningArticleWithModule } from './models/learning-article.model';

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
    
    // Articles view state
    showArticles = false;
    selectedCourse: LearningCourse | null = null;
    articlesByModule: { [moduleId: string]: LearningArticleWithModule[] } = {};
    articlesLoading = false;
    articlesError: string | null = null;
    expandedModules: Set<string> = new Set(); // Track which modules are expanded

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
                this.error = 'Failed to load courses. Please try again later.';
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

        // For now, we'll load all articles and group them by module
        // In a real implementation, you'd need module IDs from the backend
        this.learningArticleService.getAllArticles().subscribe({
            next: (articles) => {
                // Group articles by module (using a mock approach since we don't have module IDs)
                // In a real implementation, articles would have a learningModuleId field
                course.modules.forEach(module => {
                    // For demonstration, we'll create mock articles for each module
                    const mockArticles: LearningArticleWithModule[] = [
                        {
                            article: {
                                id: `${module.title}-article-1`,
                                learningModuleId: module.title,
                                contentItems: [
                                    {
                                        content: `This is the introduction content for ${module.title}. Learn the fundamentals and build a strong foundation.`,
                                        sectionBlockNumber: 1
                                    },
                                    {
                                        content: `This is the main content section for ${module.title}. Dive deeper into the concepts and practical applications.`,
                                        sectionBlockNumber: 2
                                    },
                                    {
                                        content: `This is the conclusion section for ${module.title}. Review what you've learned and prepare for the next steps.`,
                                        sectionBlockNumber: 3
                                    }
                                ]
                            },
                            moduleTitle: module.title,
                            moduleDescription: module.description
                        }
                    ];
                    this.articlesByModule[module.title] = mockArticles;
                });
                this.articlesLoading = false;
                // Set first module as expanded by default
                if (course.modules.length > 0) {
                    this.expandedModules.add(course.modules[0].title);
                }
            },
            error: (error) => {
                this.articlesError = 'Failed to load articles. Please try again later.';
                this.articlesLoading = false;
                console.error('Error loading articles:', error);
            }
        });
    }

    goBackToCourses() {
        this.showArticles = false;
        this.selectedCourse = null;
        this.articlesByModule = {};
        this.expandedModules.clear();
    }

    getModulesWithArticles() {
        if (!this.selectedCourse) return [];
        
        return this.selectedCourse.modules.map(module => ({
            ...module,
            articles: this.articlesByModule[module.title] || []
        }));
    }

    toggleModule(moduleTitle: string) {
        if (this.expandedModules.has(moduleTitle)) {
            this.expandedModules.delete(moduleTitle);
        } else {
            this.expandedModules.add(moduleTitle);
        }
    }

    isModuleExpanded(moduleTitle: string): boolean {
        return this.expandedModules.has(moduleTitle);
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

    getDifficultySeverity(course: LearningCourse): string {
        const difficulty = this.getCourseDifficulty(course);
        switch (difficulty) {
            case 'Beginner': return 'success';
            case 'Intermediate': return 'warning';
            case 'Advanced': return 'danger';
            default: return 'info';
        }
    }

    trackByCourseId(index: number, course: LearningCourse): string {
        return course.id;
    }

    trackByModuleTitle(index: number, module: any): string {
        return module.title;
    }

    trackByArticleId(index: number, articleWithModule: LearningArticleWithModule): string {
        return articleWithModule.article.id;
    }

    trackByContentItem(index: number, contentItem: any): number {
        return contentItem.sectionBlockNumber;
    }
}
