import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { LearningCourseService } from './service/learning-course.service';
import { LearningArticleService } from './service/learning-article.service';
import { LearningCourse, LearningModule } from './models/learning-course.model';
import { LearningArticle, LearningArticleWithModule } from './models/learning-article.model';
import { LearningArticleComponent } from './components/learning-article/learning-article.component';
import { CourseListComponent } from './components/course-list/course-list.component';
import { CourseDetailComponent } from './components/course-detail/course-detail.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-theory',
    standalone: true,
    imports: [CommonModule, ButtonModule, RouterModule, LearningArticleComponent, CourseListComponent, CourseDetailComponent],
    templateUrl: './theory.component.html',
    styleUrls: ['./theory.component.scss']
})
export class TheoryComponent implements OnInit, OnDestroy {
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
    articleLoading = false;

    // Route parameters
    currentCourseId: string | null = null;
    currentArticleId: string | null = null;
    private routeSubscription: Subscription = new Subscription();

    constructor(
        private learningCourseService: LearningCourseService,
        private learningArticleService: LearningArticleService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadCourses();
        this.setupRouteSubscription();
    }

    ngOnDestroy() {
        this.routeSubscription.unsubscribe();
    }

    private setupRouteSubscription() {
        this.routeSubscription = this.route.params.subscribe(params => {
            this.currentCourseId = params['courseId'] || null;
            this.currentArticleId = params['articleId'] || null;
            
            this.updateViewState();
        });
    }

    private updateViewState() {
        if (this.currentArticleId && this.currentCourseId) {
            // Show article detail
            this.showArticles = true;
            this.showArticleDetail = true;
            this.loadCourseAndArticle();
        } else if (this.currentCourseId) {
            // Show course detail
            this.showArticles = true;
            this.showArticleDetail = false;
            this.loadCourseAndArticles();
        } else {
            // Show course list
            this.showArticles = false;
            this.showArticleDetail = false;
            this.resetState();
        }
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

    private loadCourseAndArticles() {
        if (!this.currentCourseId) return;
        
        // Find the course by ID
        const course = this.courses.find(c => c.id === this.currentCourseId);
        if (course) {
            this.selectedCourse = course;
            this.loadArticlesForCourse(course);
        } else {
            // Course not found in current list, might need to load it
            this.loadCourseById(this.currentCourseId);
        }
    }

    private loadCourseAndArticle() {
        if (!this.currentCourseId || !this.currentArticleId) return;
        
        // First load the course and articles
        this.loadCourseAndArticles();
        
        // Then find and load the specific article
        this.loadArticleById(this.currentArticleId);
    }

    private loadCourseById(courseId: string) {
        this.loading = true;
        this.error = null;
        
        this.learningCourseService.getCourseById(courseId).subscribe({
            next: (course) => {
                this.selectedCourse = course;
                this.loadArticlesForCourse(course);
                this.loading = false;
            },
            error: (error) => {
                this.error = 'Курс не найден.';
                this.loading = false;
                console.error('Error loading course:', error);
            }
        });
    }

    private loadArticleById(articleId: string) {
        this.articleLoading = true;
        this.learningArticleService.getArticleById(articleId).subscribe({
            next: (article) => {
                this.selectedArticle = article;
                this.articleLoading = false;
                // Find the module for this article
                if (this.selectedCourse) {
                    const module = this.selectedCourse.modules.find(m => m.id === article.learningModuleId);
                    if (module) {
                        this.selectedModule = module;
                    }
                }
            },
            error: (error) => {
                this.articleLoading = false;
                console.error('Error loading article:', error);
                // Fallback: try to find article in already loaded articles
                this.findArticleInLoadedData(articleId);
            }
        });
    }

    private findArticleInLoadedData(articleId: string) {
        // Search through already loaded articles
        for (const moduleId in this.articlesByModule) {
            const articles = this.articlesByModule[moduleId];
            const article = articles.find(a => a.article.id === articleId);
            if (article) {
                this.selectedArticle = article.article;
                this.articleLoading = false;
                if (this.selectedCourse) {
                    const module = this.selectedCourse.modules.find(m => m.id === moduleId);
                    if (module) {
                        this.selectedModule = module;
                    }
                }
                break;
            }
        }
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
        this.router.navigate(['/theory']);
    }

    goBackToArticles() {
        if (this.currentCourseId) {
            this.router.navigate(['/theory/course', this.currentCourseId]);
        } else {
            this.router.navigate(['/theory']);
        }
    }

    openArticle(article: LearningArticle, module: LearningModule) {
        if (this.currentCourseId) {
            this.router.navigate(['/theory/course', this.currentCourseId, 'article', article.id]);
        }
    }

    private resetState() {
        this.selectedCourse = null;
        this.selectedArticle = null;
        this.selectedModule = null;
        this.articlesByModule = {};
        this.expandedModules.clear();
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
