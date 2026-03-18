import { AccidentalTools } from './Tools/AccidentalTools';
import { DurationTools } from './Tools/DurationTools';
import { FileTools } from './Tools/FileTools';
import { HistoryTools } from './Tools/HistoryTools';
import { ZoomTools } from './Tools/ZoomTools';

type Props = {
  musicXmlFile: string | null;
  setMusicXmlFile: (xml: string) => void;
  zoom: number;
  setZoom: (next: number) => void;
};

export function TopPanel({
  musicXmlFile,
  setMusicXmlFile,
  zoom,
  setZoom,
}: Props) {
  return (
    <div className="score-editor__panel">
      <FileTools musicXmlFile={musicXmlFile} setMusicXmlFile={setMusicXmlFile} />
      <span className="score-editor__separator" aria-hidden />
      <HistoryTools musicXmlFile={musicXmlFile} setMusicXmlFile={setMusicXmlFile} />
      <span className="score-editor__separator" aria-hidden />
      <ZoomTools zoom={zoom} setZoom={setZoom} />
      <span className="score-editor__separator" aria-hidden />
      <DurationTools musicXmlFile={musicXmlFile} setMusicXmlFile={setMusicXmlFile} />
      <span className="score-editor__separator" aria-hidden />
      <AccidentalTools musicXmlFile={musicXmlFile} setMusicXmlFile={setMusicXmlFile} />
    </div>
  );
}
