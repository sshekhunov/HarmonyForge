import { Component, Input, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LearningExercise, ExerciseAppType } from '../../models/learning-exercise.model';
import { LearningArticleContentItem } from '../../models/learning-article.model';
import { ScoreAnalysisExerciseComponent } from '../../../../shared/components/score-analysis-exercise/score-analysis-exercise.component';
import { LearningCourseService } from '../../service/learning-course.service';
import { LearningExerciseService } from '../../service/learning-exercise.service';
import { StudentProfileService } from '../../service/student-profile.service';
import { AuthStateService } from '../../../../shared/services/auth-state.service';
import { HarmonyAnalysisResponse } from '../../../training/training.model';

@Component({
  selector: 'app-learning-exercise',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    ProgressSpinnerModule,
    RouterModule,
    ScoreAnalysisExerciseComponent
  ],
  templateUrl: './learning-exercise.component.html',
  styleUrls: ['./learning-exercise.component.scss']
})
export class LearningExerciseComponent implements OnInit {
  @Input() exercise: LearningExercise | null = null;
  @Input() moduleTitle: string = '';
  @Input() moduleDescription: string = '';
  @Input() loading: boolean = false;

  loadFromRoute = false;
  courseId: string | null = null;
  taskContentItems: LearningArticleContentItem[] = [];

  constructor(
    @Optional() private route: ActivatedRoute,
    @Optional() private router: Router,
    @Optional() private learningCourseService: LearningCourseService,
    @Optional() private learningExerciseService: LearningExerciseService,
    @Optional() private studentProfileService: StudentProfileService,
    @Optional() private authStateService: AuthStateService
  ) { }

  ngOnInit(): void {
    if (this.route && this.learningExerciseService && this.learningCourseService) {
      this.loadFromRoute = true;
      this.route.params.subscribe(params => {
        this.courseId = params['courseId'] || null;
        const exerciseId = params['exerciseId'];
        if (exerciseId) {
          this.loadExercise(exerciseId);
        }
      });
    }
  }

  private loadExercise(exerciseId: string): void {
    if (!this.learningExerciseService || !this.learningCourseService) {
      return;
    }

    this.loading = true;

    this.learningExerciseService.getExerciseById(exerciseId).subscribe({
      next: (exercise) => {
        this.exercise = exercise;
        this.taskContentItems = exercise.taskContentItems.map(item => ({
          content: item.content,
          order: item.order,
          type: item.type
        }));
        if (this.courseId) {
          this.loadCourseForModule(exercise.learningModuleId);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading exercise:', error);
      }
    });
  }

  private loadCourseForModule(moduleId: string): void {
    if (!this.courseId || !this.learningCourseService) {
      this.loading = false;
      return;
    }

    this.learningCourseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        const module = course.modules.find(m => m.id === moduleId);
        if (module) {
          this.moduleTitle = module.title || '';
          this.moduleDescription = module.description || '';
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading course:', error);
      }
    });
  }

  onGoBack(): void {
    if (this.loadFromRoute && this.router) {
      if (this.courseId) {
        this.router.navigate(['/theory/course', this.courseId]);
      } else {
        this.router.navigate(['/theory']);
      }
    }
  }

  getBackLink(): string {
    if (this.loadFromRoute && this.courseId) {
      return `/theory/course/${this.courseId}`;
    }
    return '';
  }

  isScoreAnalysisExercise(): boolean {
    return this.exercise?.appType === ExerciseAppType.ScoreAnalysis;
  }

  onAnalysisComplete(response: HarmonyAnalysisResponse): void {
    if (this.exercise && this.authStateService && this.studentProfileService) {
      const user = this.authStateService.getUser();
      if (user && user.userId) {
        this.studentProfileService.updateLearningItemStatus({
          userId: user.userId,
          learningItemId: this.exercise.id,
          learningItemType: 'Excercise',
          isCompleted: response.isSuccessful
        }).subscribe({
          next: () => {
            console.log('Exercise status updated successfully');
          },
          error: (error) => {
            console.error('Error updating exercise status:', error);
          }
        });
      }
    }
  }
}

