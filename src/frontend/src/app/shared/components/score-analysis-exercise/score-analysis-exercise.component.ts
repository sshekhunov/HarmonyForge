import { Component, ViewChild, ElementRef, Input, Output, EventEmitter, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { OsmdRendererModule } from '@/shared/components/osmd-renderer/osmd-renderer.module';
import { HighlightedNote, NotePosition } from '@/shared/components/osmd-renderer/osmd-renderer.component';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { SplitterModule } from 'primeng/splitter';
import { TrainingService } from '../../../pages/training/training.service';
import { HarmonyAnalysisRequest, HarmonyAnalysisResponse, AnalysisResult, SeverityLevel, MusicXmlNotePosition } from '../../../pages/training/training.model';
import { LearningContentRendererComponent } from '@/shared/components/learning-content-renderer/learning-content-renderer.component';
import { LearningArticleContentItem } from '../../../pages/theory/models/learning-article.model';

@Component({
    selector: 'app-score-analysis-exercise',
    standalone: true,
    templateUrl: './score-analysis-exercise.component.html',
    styleUrls: ['./score-analysis-exercise.component.scss'],
    imports: [CommonModule, RouterModule, OsmdRendererModule, PanelModule, ButtonModule, SplitterModule, LearningContentRendererComponent]
})
export class ScoreAnalysisExerciseComponent implements OnInit {
    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    @Input() taskContentItems: LearningArticleContentItem[] = [];
    @Input() taskTitle: string = 'Задание';
    @Input() backLink?: string;

    @Output() analysisComplete = new EventEmitter<HarmonyAnalysisResponse>();

    musicXml = '';
    files: any[] = [];
    checkResult = '';
    isLoading = false;
    analysisResult: AnalysisResult | null = null;
    isSuccessful = false;
    highlightedNotes: HighlightedNote[] = [];

    nestedPanelSizes: number[] = [50, 50];
    SeverityLevel = SeverityLevel;

    constructor(
        private trainingService: TrainingService,
        @Optional() private router: Router
    ) {}

    ngOnInit(): void {
        this.musicXml = '';
        this.checkResult = '';
        this.analysisResult = null;
        this.isSuccessful = false;
        this.highlightedNotes = [];
        this.updateNestedPanelSizes();
    }

    private updateNestedPanelSizes() {
        if (!this.analysisResult && this.checkResult === '') {
            this.nestedPanelSizes = [90, 10];
        } else {
            this.nestedPanelSizes = [50, 50];
        }
    }

    getSeverityClass(severity: SeverityLevel): string {
        switch (severity) {
            case SeverityLevel.Low:
                return 'severity-low';
            case SeverityLevel.Medium:
                return 'severity-medium';
            case SeverityLevel.High:
                return 'severity-high';
            default:
                return '';
        }
    }

    getSeverityLabel(severity: SeverityLevel): string {
        switch (severity) {
            case SeverityLevel.Low:
                return 'Низкая';
            case SeverityLevel.Medium:
                return 'Средняя';
            case SeverityLevel.High:
                return 'Высокая';
            default:
                return '';
        }
    }

    getSeverityColor(severity: SeverityLevel): string {
        switch (severity) {
            case SeverityLevel.Low:
                return '#10b981'; // Green
            case SeverityLevel.Medium:
                return '#f59e0b'; // Orange/Amber
            case SeverityLevel.High:
                return '#ef4444'; // Red
            default:
                return '#6b7280'; // Gray
        }
    }

    convertAnalysisResultToHighlightedNotes(analysisResult: AnalysisResult | null): HighlightedNote[] {
        if (!analysisResult || !analysisResult.positions) {
            return [];
        }

        const highlightedNotes: HighlightedNote[] = [];

        analysisResult.positions.forEach((position) => {
            const color = this.getSeverityColor(position.severity);

            if (position.relatedNotes && position.relatedNotes.length > 0) {
                position.relatedNotes.forEach((notePos: MusicXmlNotePosition) => {
                    const notePosition = new NotePosition(
                        notePos.measureArrayIndex,
                        notePos.measureIndex,
                        notePos.staffEntryIndex,
                        notePos.voiceEntryIndex,
                        notePos.noteIndex
                    );
                    highlightedNotes.push(new HighlightedNote(notePosition, color));
                });
            }
        });

        return highlightedNotes;
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
        this.analysisResult = null;
        this.isSuccessful = false;
        this.highlightedNotes = [];
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
                this.analysisResult = response.analysisResult || null;
                this.checkResult = '';
                this.isSuccessful = true;
                this.highlightedNotes = [...this.convertAnalysisResultToHighlightedNotes(this.analysisResult)];                
                this.analysisComplete.emit(response);
            } else {
                this.checkResult = `Ошибка анализа: ${response?.errorMessage || 'Неизвестная ошибка'}`;
                this.analysisResult = null;
                this.isSuccessful = false;
                this.highlightedNotes = [];
            }
        } catch (error) {
            this.checkResult = `Ошибка при отправке запроса на сервер: ${error}`;
            this.analysisResult = null;
            this.isSuccessful = false;
            this.highlightedNotes = [];
        } finally {
            this.isLoading = false;
            this.updateNestedPanelSizes();
        }
    }

    onBackClick(): void {
        if (this.backLink && this.router) {
            this.router.navigateByUrl(this.backLink);
        }
    }
}

