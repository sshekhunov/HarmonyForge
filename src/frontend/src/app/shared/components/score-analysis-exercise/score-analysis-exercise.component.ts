import { Component, ViewChild, ElementRef, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OsmdRendererModule } from '@/shared/components/osmd-renderer/osmd-renderer.module';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { SplitterModule } from 'primeng/splitter';
import { TrainingService } from '../../../pages/training/training.service';
import { HarmonyAnalysisRequest, HarmonyAnalysisResponse } from '../../../pages/training/training.model';
import { LearningContentRendererComponent } from '@/shared/components/learning-content-renderer/learning-content-renderer.component';
import { LearningArticleContentItem } from '../../../pages/theory/models/learning-article.model';

@Component({
    selector: 'app-score-analysis-exercise',
    standalone: true,
    templateUrl: './score-analysis-exercise.component.html',
    styleUrls: ['./score-analysis-exercise.component.scss'],
    imports: [CommonModule, OsmdRendererModule, PanelModule, ButtonModule, SplitterModule, LearningContentRendererComponent]
})
export class ScoreAnalysisExerciseComponent implements OnInit {
    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    @Input() taskContentItems: LearningArticleContentItem[] = [];
    @Input() taskTitle: string = 'Задание';

    @Output() analysisComplete = new EventEmitter<HarmonyAnalysisResponse>();
    @Output() backClick = new EventEmitter<void>();

    musicXml = '';
    files: any[] = [];
    checkResult = '';
    noteCount = 0;
    isLoading = false;

    nestedPanelSizes: number[] = [50, 50];

    constructor(private trainingService: TrainingService) {}

    ngOnInit(): void {
        this.musicXml = '';
        this.checkResult = '';
        this.noteCount = 0;
        this.updateNestedPanelSizes();
    }

    private updateNestedPanelSizes() {
        if (this.checkResult === '') {
            this.nestedPanelSizes = [90, 10];
        } else {
            this.nestedPanelSizes = [50, 50];
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.processFile(file);
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget) {
            (event.currentTarget as HTMLElement).classList.add('drag-over');
        }
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget) {
            (event.currentTarget as HTMLElement).classList.remove('drag-over');
        }
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget) {
            (event.currentTarget as HTMLElement).classList.remove('drag-over');
        }

        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            const file = event.dataTransfer.files[0];
            this.processFile(file);
        }
    }

    private processFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            this.musicXml = reader.result as string;
            this.files = [file];
        };
        reader.readAsText(file);
    }

    onClear() {
        this.files = [];
        this.musicXml = '';
        this.checkResult = '';
        this.noteCount = 0;
        this.updateNestedPanelSizes();

        if (this.fileInputRef?.nativeElement) {
            this.fileInputRef.nativeElement.value = '';
        }
    }

    async onUpload(_event: unknown) {
        if (!this.musicXml) {
            this.checkResult = 'Ошибка: Не выбран файл для анализа';
            return;
        }

        this.isLoading = true;
        this.checkResult = '';

        try {
            const request: HarmonyAnalysisRequest = {
                musicXmlContent: this.musicXml
            };

            const response = await this.trainingService.analyzeHarmony(request).toPromise();

            if (response?.isSuccessful) {
                this.noteCount = response.noteCount;
                this.checkResult = `Анализ завершен успешно! Найдено нот: ${response.noteCount}`;
                this.analysisComplete.emit(response);
            } else {
                this.checkResult = `Ошибка анализа: ${response?.errorMessage || 'Неизвестная ошибка'}`;
            }
        } catch (error) {
            this.checkResult = `Ошибка при отправке запроса на сервер: ${error}`;
        } finally {
            this.isLoading = false;
            this.updateNestedPanelSizes();
        }
    }
}

