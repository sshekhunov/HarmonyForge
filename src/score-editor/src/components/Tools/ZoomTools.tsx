import { ZoomIn, ZoomOut } from 'lucide-react';

type Props = {
  zoom: number;
  setZoom: (next: number) => void;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function ZoomTools({ zoom, setZoom }: Props) {
  const min = 0.5;
  const max = 2.0;
  const step = 0.1;
  const canOut = zoom > min + 1e-6;
  const canIn = zoom < max - 1e-6;
  const zoomPct = Math.round(zoom * 100);
  const optionsPct: number[] = [];
  for (let pct = 50; pct <= 200; pct += 10) optionsPct.push(pct);

  return (
    <span className="score-editor__zoom" role="group" aria-label="Zoom">
      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={() => setZoom(clamp(Number((zoom - step).toFixed(2)), min, max))}
        disabled={!canOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <ZoomOut size={18} strokeWidth={1.75} />
        </span>
      </button>

      <button
        type="button"
        className="score-editor__btn score-editor__btn--icon-only"
        onClick={() => setZoom(clamp(Number((zoom + step).toFixed(2)), min, max))}
        disabled={!canIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <span className="score-editor__btn-icon" aria-hidden>
          <ZoomIn size={18} strokeWidth={1.75} />
        </span>
      </button>

      <label className="score-editor__zoom-label">
        <span className="score-editor__sr-only">Zoom</span>
        <select
          className="score-editor__zoom-select"
          value={String(zoomPct)}
          onChange={(e) => {
            const pct = Number(e.target.value);
            if (!Number.isFinite(pct)) return;
            setZoom(clamp(Number((pct / 100).toFixed(2)), min, max));
          }}
          aria-label="Zoom percentage"
          title="Zoom percentage"
        >
          {optionsPct.map((pct) => (
            <option key={pct} value={String(pct)}>
              {pct}%
            </option>
          ))}
        </select>
      </label>
    </span>
  );
}

