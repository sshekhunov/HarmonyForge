import {AfterViewInit, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Guid} from 'guid-typescript';
import {OpenSheetMusicDisplay} from 'opensheetmusicdisplay';

@Component({
  standalone: true,
  selector: 'lib-osmd-renderer',
  templateUrl: './osmd-renderer.component.html',
  styleUrls: ['./osmd-renderer.component.css']
})
export class OsmdRendererComponent implements OnChanges, AfterViewInit {


  /**
   * the URL to, or the contents of a valid MusicXML document.
   */
  @Input() source?: string;

  private openSheetMusicDisplay?: OpenSheetMusicDisplay;

  public id: string;


  constructor() {
    this.id = `music-xml-${Guid.create()}`;
  }

  ngAfterViewInit() {
    this.initRenderer(this.id);
    renderMusicXml(this.openSheetMusicDisplay, this.source);
  }

  /**
   * Initializes the renderer.
   *
   * @param containerId the id of the div that will hold the SVG.
   *
   */
  private initRenderer(containerId: string) {
    try {
      const canvas = document.getElementById(containerId);
      if (!canvas) {
        console.error(`Container with id ${containerId} not found.`);
        return;
      }
      this.openSheetMusicDisplay = new OpenSheetMusicDisplay(canvas as HTMLElement);
    } catch (e) {
      console.error(e);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    renderMusicXml(this.openSheetMusicDisplay, this.source);
  }
}

/**
 * Renders the MusicXML file.
 *
 * @param osmd the renderer.
 * @param source the URL to, or the contents of a valid MusicXML document.
 */
function renderMusicXml(osmd?: OpenSheetMusicDisplay, source?: string) {
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
  });
}
