import { Routes } from '@angular/router';
import { TheoryComponent } from './theory.component';
import { CourseDetailComponent } from './components/course-detail/course-detail.component';
import { LearningArticleComponent } from './components/learning-article/learning-article.component';

const theoryRoutes: Routes = [
    {
        path: '',
        component: TheoryComponent
    },
    {
        path: 'course/:courseId',
        component: CourseDetailComponent
    },
    {
        path: 'course/:courseId/article/:articleId',
        component: LearningArticleComponent
    }
];

export default theoryRoutes;
