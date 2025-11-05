import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OsmdRendererModule } from '@/shared/components/osmd-renderer/osmd-renderer.module';
import { FileUpload } from 'primeng/fileupload';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { TrainingService } from './training.service';
import { HarmonyAnalysisRequest, HarmonyAnalysisResponse } from './training.model';

@Component({
    selector: 'app-training',
    standalone: true,
    templateUrl: './training.component.html',
    styleUrls: ['./training.component.scss'],
    imports: [CommonModule, OsmdRendererModule, FileUpload, PanelModule, ButtonModule]
})
export class Training {

    musicXml = '';
    files:any[] = [];
    checkResult = '';
    noteCount = 0;
    isLoading = false;

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
