import { Routes } from '@angular/router';
import { TheoryComponent } from './theory.component';

const theoryRoutes: Routes = [
    {
        path: '',
        component: TheoryComponent
    },
    {
        path: 'course/:courseId',
        component: TheoryComponent
    },
    {
        path: 'course/:courseId/article/:articleId',
        component: TheoryComponent
    }
];

export default theoryRoutes;
