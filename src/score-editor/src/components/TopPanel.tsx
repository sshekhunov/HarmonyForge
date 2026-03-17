import { AccidentalTools } from './Tools/AccidentalTools';
import { DurationTools } from './Tools/DurationTools';
import { FileTools } from './Tools/FileTools';

type Props = {
  musicXmlFile: string | null;
  setMusicXmlFile: (xml: string) => void;
};

export function TopPanel({
  musicXmlFile,
  setMusicXmlFile,
}: Props) {
  return (
    <div className="score-editor__panel">
      <FileTools musicXmlFile={musicXmlFile} setMusicXmlFile={setMusicXmlFile} />
      <span className="score-editor__separator" aria-hidden />
      <DurationTools musicXmlFile={musicXmlFile} setMusicXmlFile={setMusicXmlFile} />
      <span className="score-editor__separator" aria-hidden />
      <AccidentalTools musicXmlFile={musicXmlFile} setMusicXmlFile={setMusicXmlFile} />
    </div>
  );
}
