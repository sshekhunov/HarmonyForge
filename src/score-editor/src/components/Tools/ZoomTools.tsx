type Props = {
  zoom: number;
  setZoom: (next: number) => void;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function ZoomInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5C16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm1-7h-2v2h-2v2h2v2h2v-2h2V9h-2V7z"
      />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5C16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v2H7V9z"
      />
    </svg>
  );
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
          <ZoomOutIcon />
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
          <ZoomInIcon />
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

