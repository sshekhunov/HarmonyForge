import { Component } from '@angular/core';

@Component({
    selector: 'app-training',
    standalone: true,
    templateUrl: './training.component.html',
})
export class Training {

    musicXml = '';

    ngOnInit(): void {
        this.musicXml = './assets/SchbAvMaSample.musicxml';
      }
}
