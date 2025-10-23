import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OsmdRendererModule } from 'src/app/shared/osmd-renderer/osmd-renderer.module';
import { FileUpload } from 'primeng/fileupload';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';

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

    ngOnInit(): void {
        this.musicXml = '';
        this.checkResult = '';
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
    }

    onUpload(_event: unknown) {
        this.checkResult = 'test';
    }

}
