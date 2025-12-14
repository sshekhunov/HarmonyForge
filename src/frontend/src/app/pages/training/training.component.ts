import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OsmdRendererModule } from '@/shared/components/osmd-renderer/osmd-renderer.module';
import { FileUpload } from 'primeng/fileupload';
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
    imports: [CommonModule, OsmdRendererModule, FileUpload, PanelModule, ButtonModule, SplitterModule, LearningContentRendererComponent]
})
export class Training {

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

    onSelectedFiles(event: { currentFiles: any[]; }) {
        this.files = event.currentFiles;
        const first = this.files[0];
        if (first instanceof File) {
            const reader = new FileReader();
            reader.onload = () => {
                this.musicXml = reader.result as string;
            };
            reader.readAsText(first);
        }
    }

    onClear() {
        this.files = [];
        this.musicXml = '';
        this.checkResult = '';
        this.noteCount = 0;
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
