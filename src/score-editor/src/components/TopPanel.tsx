import { AccidentalTools } from './Tools/AccidentalTools';
import { FileTools } from './Tools/FileTools';

type Props = {
  canSave: boolean;
  hasSelection: boolean;
  onOpen: () => void;
  onSave: () => void;
  onNatural: () => void;
  onSharp: () => void;
  onFlat: () => void;
  onDoubleSharp: () => void;
  onDoubleFlat: () => void;
  onClearAccidental: () => void;
};

export function TopPanel({
  canSave,
  hasSelection,
  onOpen,
  onSave,
  onNatural,
  onSharp,
  onFlat,
  onDoubleSharp,
  onDoubleFlat,
  onClearAccidental,
}: Props) {
  return (
    <div className="score-editor__panel">
      <FileTools onOpen={onOpen} onSave={onSave} canSave={canSave} />
      <span className="score-editor__separator" aria-hidden />
      <AccidentalTools
        hasSelection={hasSelection}
        onNatural={onNatural}
        onSharp={onSharp}
        onFlat={onFlat}
        onDoubleSharp={onDoubleSharp}
        onDoubleFlat={onDoubleFlat}
        onClear={onClearAccidental}
      />
    </div>
  );
}
