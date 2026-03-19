import { AccidentalTools } from './Tools/AccidentalTools';
import { DurationTools } from './Tools/DurationTools';
import { EditModeTools, type EditMode } from './Tools/EditModeTools';
import { FileTools } from './Tools/FileTools';
import { HistoryTools } from './Tools/HistoryTools';
import { ZoomTools } from './Tools/ZoomTools';
import type { MusicXmlDocument } from '../models/musicXmlDocument';

type Props = {
  musicDoc: MusicXmlDocument | null;
  setMusicDoc: (doc: MusicXmlDocument | null) => void;
  zoom: number;
  setZoom: (next: number) => void;
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
};

export function TopPanel({
  musicDoc,
  setMusicDoc,
  zoom,
  setZoom,
  editMode,
  setEditMode,
}: Props) {
  return (
    <div className="score-editor__panel">
      <FileTools musicDoc={musicDoc} setMusicDoc={setMusicDoc} />
      <span className="score-editor__separator" aria-hidden />
      <HistoryTools musicDoc={musicDoc} setMusicDoc={setMusicDoc} />
      <span className="score-editor__separator" aria-hidden />
      <ZoomTools zoom={zoom} setZoom={setZoom} />
      <span className="score-editor__separator" aria-hidden />
      <EditModeTools mode={editMode} setMode={setEditMode} />
      <span className="score-editor__separator" aria-hidden />
      <DurationTools musicDoc={musicDoc} setMusicDoc={setMusicDoc} />
      <span className="score-editor__separator" aria-hidden />
      <AccidentalTools musicDoc={musicDoc} setMusicDoc={setMusicDoc} />
    </div>
  );
}
