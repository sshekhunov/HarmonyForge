import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OsmdRendererModule } from '@/shared/components/osmd-renderer/osmd-renderer.module';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { SplitterModule } from 'primeng/splitter';
import { TrainingService } from './training.service';
import { HarmonyAnalysisRequest, HarmonyAnalysisResponse } from './training.model';
import { LearningContentRendererComponent } from '@/shared/components/learning-content-renderer/learning-content-renderer.component';
import { LearningArticleContentItem } from '../theory/models/learning-article.model';

@Component({
    selector: 'app-training',
    standalone: true,
    templateUrl: './training.component.html',
    styleUrls: ['./training.component.scss'],
    imports: [CommonModule, OsmdRendererModule, PanelModule, ButtonModule, SplitterModule, LearningContentRendererComponent]
})
export class Training {
    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    musicXml = '';
    files:any[] = [];
    checkResult = '';
    noteCount = 0;
    isLoading = false;

    // Mock content items for section 1
    mockContentItems: LearningArticleContentItem[] = [
        {
            content: 'Добро пожаловать в тренажер гармонизации мелодии! Этот инструмент поможет вам проверить правильность гармонизации ваших музыкальных произведений.',
            order: 0,
            type: 0 // Text
        },
        {
            content: '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note></measure></part></score-partwise>',
            order: 1,
            type: 3 // MusicXml
        },
        {
            content: 'Загрузите ваш файл в формате MusicXML в секции 2, затем нажмите кнопку "Проверить" для анализа гармонии. Результаты анализа будут отображены в секции 3.',
            order: 2,
            type: 0 // Text
        }
    ];

    constructor(private trainingService: TrainingService) {}

    ngOnInit(): void {
        this.musicXml = '';
        this.checkResult = '';
        this.noteCount = 0;
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
            } else {
                this.checkResult = `Ошибка анализа: ${response?.errorMessage || 'Неизвестная ошибка'}`;
            }
        } catch (error) {
            this.checkResult = `Ошибка при отправке запроса на сервер: ${error}`;
        } finally {
            this.isLoading = false;
        }
    }

}
