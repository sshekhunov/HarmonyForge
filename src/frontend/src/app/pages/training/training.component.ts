import { Component } from '@angular/core';
import { OsmdRendererModule } from 'src/app/shared/osmd-renderer/osmd-renderer.module';
import { FileUpload } from 'primeng/fileupload';
import { PanelModule } from 'primeng/panel';

@Component({
    selector: 'app-training',
    standalone: true,
    templateUrl: './training.component.html',
    imports: [OsmdRendererModule, FileUpload, PanelModule]
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
