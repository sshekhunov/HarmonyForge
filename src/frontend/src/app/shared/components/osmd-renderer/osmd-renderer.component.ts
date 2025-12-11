import {AfterViewInit, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Guid} from 'guid-typescript';
import {OpenSheetMusicDisplay} from 'opensheetmusicdisplay';

export class NotePosition {
  constructor(
    public measureArrayIndex: number,
    public measureIndex: number,
    public staffEntryIndex: number,
    public voiceEntryIndex: number,
    public noteIndex: number
  ) {}
}

export class HighlightedNote {
  constructor(
    public position: NotePosition,
    public color: string
  ) {}
}

@Component({
  standalone: true,
  selector: 'lib-osmd-renderer',
  templateUrl: './osmd-renderer.component.html',
  styleUrls: ['./osmd-renderer.component.css']
})
export class OsmdRendererComponent implements OnChanges, AfterViewInit {


  @Input() source?: string;

  @Input() highlightedNotes?: HighlightedNote[];

  @Input() showTitleAndAuthor: boolean = true;

  private openSheetMusicDisplay?: OpenSheetMusicDisplay;
  private previousHighlightedNotes: HighlightedNote[] = [];

  public id: string;


  constructor() {
    this.id = `music-xml-${Guid.create()}`;
  }

  ngAfterViewInit() {
    this.initRenderer(this.id);
    renderMusicXml(this.openSheetMusicDisplay, this.source, this);
  }

  private initRenderer(containerId: string) {
    try {
      const canvas = document.getElementById(containerId);
      if (!canvas) {
        console.error(`Container with id ${containerId} not found.`);
        return;
      }
      this.openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas as HTMLElement);
      this.updateDisplayOptions();
    } catch (e) {
      console.error(e);
    }
  }

  updateDisplayOptions(): void {
    if (!this.openSheetMusicDisplay) {
      return;
    }

    try {
      const options: any = {
        drawTitle: this.showTitleAndAuthor,
        drawComposer: this.showTitleAndAuthor
      };

      if (this.openSheetMusicDisplay.setOptions) {
        this.openSheetMusicDisplay.setOptions(options);
      } else if ((this.openSheetMusicDisplay as any).Options) {
        (this.openSheetMusicDisplay as any).Options.drawTitle = this.showTitleAndAuthor;
        (this.openSheetMusicDisplay as any).Options.drawComposer = this.showTitleAndAuthor;
      }
    } catch (error) {
      console.error('Error updating display options:', error);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['source']) {
      renderMusicXml(this.openSheetMusicDisplay, this.source, this);
    }

    if (changes['highlightedNotes'] && this.openSheetMusicDisplay) {
      this.applyHighlightedNotes();
    }

    if (changes['showTitleAndAuthor'] && this.openSheetMusicDisplay) {
      this.updateDisplayOptions();
      if (this.openSheetMusicDisplay && this.source) {
        this.openSheetMusicDisplay.render();
      }
    }
  }

  applyHighlightedNotes(): void {
    if (!this.openSheetMusicDisplay) {
      return;
    }

    this.clearAllHighlights();

    if (this.highlightedNotes && this.highlightedNotes.length > 0) {
      this.highlightedNotes.forEach((highlightedNote: HighlightedNote) => {
        this.highlightNote(highlightedNote.position, highlightedNote.color);
      });
      this.openSheetMusicDisplay.render();
    }

    this.previousHighlightedNotes = this.highlightedNotes ? [...this.highlightedNotes] : [];
  }

  private clearAllHighlights(): void {
    if (!this.openSheetMusicDisplay) {
      return;
    }

    try {
      const graphic = (this.openSheetMusicDisplay as any).graphic as any;

      if (!graphic || !graphic.measureList) {
        return;
      }

      this.previousHighlightedNotes.forEach((highlightedNote: HighlightedNote) => {
        this.highlightNote(highlightedNote.position, undefined);
      });

      graphic.measureList.forEach((measureArray: any) => {
        if (Array.isArray(measureArray)) {
          measureArray.forEach((measure: any) => {
            if (measure && measure.staffEntries) {
              measure.staffEntries.forEach((staffEntry: any) => {
                if (staffEntry && staffEntry.graphicalVoiceEntries) {
                  staffEntry.graphicalVoiceEntries.forEach((voiceEntry: any) => {
                    if (voiceEntry && voiceEntry.notes) {
                      voiceEntry.notes.forEach((note: any) => {
                        if (note && note.sourceNote && note.sourceNote.noteheadColor) {
                          delete note.sourceNote.noteheadColor;
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('Error clearing highlights:', error);
    }
  }

  private highlightNote(position: NotePosition, color?: string): void {
    if (!this.openSheetMusicDisplay) {
      return;
    }

    try {
      const graphic = (this.openSheetMusicDisplay as any).graphic as any;

      if (!graphic || !graphic.measureList) {
        return;
      }

      const measureArray = graphic.measureList[position.measureArrayIndex];
      if (!measureArray || !Array.isArray(measureArray)) {
        return;
      }

      const measure = measureArray[position.measureIndex];
      if (!measure || !measure.staffEntries) {
        return;
      }

      const staffEntry = measure.staffEntries[position.staffEntryIndex];
      if (!staffEntry || !staffEntry.graphicalVoiceEntries) {
        return;
      }

      const voiceEntry = staffEntry.graphicalVoiceEntries[position.voiceEntryIndex];
      if (!voiceEntry || !voiceEntry.notes) {
        return;
      }

      const note = voiceEntry.notes[position.noteIndex];
      if (note && note.sourceNote) {
        if (color) {
          note.sourceNote.noteheadColor = color;
        } else {
          delete note.sourceNote.noteheadColor;
        }
      }
    } catch (err) {
      console.warn('Error highlighting note at position:', position, err);
    }
  }

  highlightNotes(notePositions: NotePosition[], color: string): void {
    if (!this.openSheetMusicDisplay) {
      console.warn('OSMD instance not available for highlighting notes');
      return;
    }

    if (!notePositions || notePositions.length === 0) {
      console.warn('No note positions provided for highlighting');
      return;
    }

    try {
      const graphic = (this.openSheetMusicDisplay as any).graphic as any;

      if (!graphic || !graphic.measureList) {
        console.warn('Graphic or measureList not available');
        return;
      }

      let highlightedCount = 0;

      notePositions.forEach((notePosition: NotePosition) => {
        this.highlightNote(notePosition, color);
        highlightedCount++;
      });

      console.log(`Successfully highlighted ${highlightedCount} notes with color ${color}`);

      this.openSheetMusicDisplay.render();
    } catch (error) {
      console.error('Error highlighting notes:', error);
    }
  }


}

function renderMusicXml(osmd?: OpenSheetMusicDisplay, source?: string, component?: OsmdRendererComponent) {
  if (!osmd) {
    console.warn('MusicXML renderer not yet initialized.');
    return;
  }
  if (!source) {
    console.warn('No MusicXML source provided.');
    return;
  }

  osmd.load(source).then(() => {
    osmd.render();

    if (component) {
      setTimeout(() => {
        component.updateDisplayOptions();
        component.applyHighlightedNotes();
      }, 300);
    }
  });
}
