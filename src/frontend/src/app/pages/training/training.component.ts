import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreAnalysisExerciseComponent } from '@/shared/components/score-analysis-exercise/score-analysis-exercise.component';
import { LearningArticleContentItem } from '../theory/models/learning-article.model';
import { HarmonyAnalysisResponse } from './training.model';

@Component({
    selector: 'app-training',
    standalone: true,
    templateUrl: './training.component.html',
    styleUrls: ['./training.component.scss'],
    imports: [CommonModule, ScoreAnalysisExerciseComponent]
})
export class Training {
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

    onAnalysisComplete(response: HarmonyAnalysisResponse) {
        // Handle analysis completion if needed
        console.log('Analysis completed:', response);
    }

    onFileCleared() {
        // Handle file cleared if needed
        console.log('File cleared');
    }
}
