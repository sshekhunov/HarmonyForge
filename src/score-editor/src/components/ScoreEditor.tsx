import { useCallback, useEffect, useRef, useState } from 'react';
import './ScoreEditor.css';

// OSMD: use interface because the package's UMD bundle export doesn't match its .d.ts
interface IOSMDInstance {
  load(content: string | Document | Blob, tempTitle?: string): Promise<unknown>;
  render(): void;
}

/** OSMD internal: GraphicSheet has MeasureList and notes with getNoteheadSVGs for exact notehead hit-test */
interface IOsmdWithGraphic extends IOSMDInstance {
  GraphicSheet?: {
    MeasureList?: unknown[][];
    measureList?: unknown[][];
  };
}

async function createOsmd(container: HTMLElement): Promise<IOSMDInstance> {
  // Bundle exposes OpenSheetMusicDisplay on default or as namespace
  const OSMD = await import('opensheetmusicdisplay');
  const Ctor = (OSMD as { OpenSheetMusicDisplay?: new (c: HTMLElement, o?: object) => IOSMDInstance }).OpenSheetMusicDisplay
    ?? (OSMD as { default?: { OpenSheetMusicDisplay?: new (c: HTMLElement, o?: object) => IOSMDInstance } }).default?.OpenSheetMusicDisplay
    ?? (OSMD as unknown as new (c: HTMLElement, o?: object) => IOSMDInstance);
  return new (Ctor as new (c: HTMLElement, o?: object) => IOSMDInstance)(container, { autoResize: true, drawTitle: true });
}

export function ScoreEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<IOSMDInstance | null>(null);
  const selectedNoteRef = useRef<{ sourceNote?: { noteheadColor?: string } } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentXml, setCurrentXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const initOsmd = useCallback(async () => {
    if (!containerRef.current) return;
    if (osmdRef.current) return;
    osmdRef.current = await createOsmd(containerRef.current);
  }, []);

  useEffect(() => {
    void initOsmd();
    return () => {
      osmdRef.current = null;
    };
  }, [initOsmd]);

  const loadXml = useCallback(
    async (xml: string) => {
      if (!osmdRef.current) {
        await initOsmd();
        if (!osmdRef.current) return;
      }
      setError(null);
      try {
        await osmdRef.current.load(xml);
        selectedNoteRef.current = null;
        setHasSelection(false);
        osmdRef.current.render();
        setCurrentXml(xml);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load score');
      }
    },
    [initOsmd]
  );

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') loadXml(text);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadXml]
  );

  const handleSaveFile = useCallback(() => {
    if (!currentXml) {
      setError('No score loaded to save.');
      return;
    }
    setError(null);
    const blob = new Blob([currentXml], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'score.musicxml';
    a.click();
    URL.revokeObjectURL(url);
  }, [currentXml]);

  const getSelectedNoteIndex = useCallback((): number | null => {
    const selected = selectedNoteRef.current?.sourceNote;
    if (!selected || !currentXml) return null;
    const raw = osmdRef.current as unknown as {
      GraphicSheet?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
      graphic?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
    };
    const graphic = raw?.GraphicSheet ?? raw?.graphic;
    const measureList = graphic?.MeasureList ?? graphic?.measureList;
    if (!Array.isArray(measureList)) return null;
    const numArrays = measureList.length;
    const numMeasures = Math.max(0, ...measureList.map((arr) => (Array.isArray(arr) ? arr.length : 0)));
    let index = 0;
    for (let measureIdx = 0; measureIdx < numMeasures; measureIdx++) {
      for (let arrayIdx = 0; arrayIdx < numArrays; arrayIdx++) {
        const measureArray = measureList[arrayIdx];
        if (!Array.isArray(measureArray)) continue;
        const measure = measureArray[measureIdx];
        if (!measure) continue;
        const m = measure as { staffEntries?: { graphicalVoiceEntries?: { notes?: unknown[] }[] }[] };
        for (const staffEntry of m.staffEntries ?? []) {
          for (const voiceEntry of staffEntry.graphicalVoiceEntries ?? []) {
            for (const note of voiceEntry.notes ?? []) {
              const n = note as { sourceNote?: { isRest?: () => boolean } };
              if (n.sourceNote === selected) return index;
              if (n.sourceNote && !n.sourceNote.isRest?.()) index++;
            }
          }
        }
      }
    }
    return null;
  }, [currentXml]);

  const applyAccidental = useCallback(
    async (alter: number, accidentalName: string) => {
      const noteIndex = getSelectedNoteIndex();
      if (noteIndex === null || currentXml === null) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentXml, 'application/xml');
      const ns = doc.documentElement.namespaceURI ?? null;
      const getByTag = (parent: Element, tag: string) =>
        ns ? parent.getElementsByTagNameNS(ns, tag) : parent.getElementsByTagName(tag);
      const createEl = (tag: string) => (ns ? doc.createElementNS(ns, tag) : doc.createElement(tag));
      const allNotes = ns ? doc.getElementsByTagNameNS(ns, 'note') : doc.getElementsByTagName('note');
      let pitchNoteIndex = 0;
      for (let i = 0; i < allNotes.length; i++) {
        const note = allNotes[i];
        if (!note || getByTag(note, 'pitch').length === 0) continue;
        if (pitchNoteIndex === noteIndex) {
          const pitch = getByTag(note, 'pitch')[0];
          if (!pitch) break;
          let alterEl = getByTag(pitch, 'alter')[0];
          if (!alterEl) {
            alterEl = createEl('alter');
            pitch.appendChild(alterEl);
          }
          alterEl.textContent = String(alter);
          const accTags = getByTag(note, 'accidental');
          let accEl = accTags[0];
          if (accidentalName) {
            if (!accEl) {
              accEl = createEl('accidental');
              note.insertBefore(accEl, note.firstChild);
            }
            accEl.textContent = accidentalName;
          } else if (accEl) {
            accEl.remove();
          }
          break;
        }
        pitchNoteIndex++;
      }
      const newXml = new XMLSerializer().serializeToString(doc);
      setCurrentXml(newXml);
      await loadXml(newXml);
      const osmd = osmdRef.current as unknown as {
        GraphicSheet?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
        graphic?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
      };
      if (!osmd) return;
      const graphic = osmd.GraphicSheet ?? osmd.graphic;
      const measureList = graphic?.MeasureList ?? graphic?.measureList;
      if (Array.isArray(measureList)) {
        const numArrays = measureList.length;
        const numMeasures = Math.max(0, ...measureList.map((arr) => (Array.isArray(arr) ? arr.length : 0)));
        let idx = 0;
        outer: for (let measureIdx = 0; measureIdx < numMeasures; measureIdx++) {
          for (let arrayIdx = 0; arrayIdx < numArrays; arrayIdx++) {
            const measureArray = measureList[arrayIdx];
            if (!Array.isArray(measureArray)) continue;
            const measure = measureArray[measureIdx];
            if (!measure) continue;
            const m = measure as { staffEntries?: { graphicalVoiceEntries?: { notes?: unknown[] }[] }[] };
            for (const staffEntry of m.staffEntries ?? []) {
              for (const voiceEntry of staffEntry.graphicalVoiceEntries ?? []) {
                for (const note of voiceEntry.notes ?? []) {
                  const n = note as { sourceNote?: { isRest?: () => boolean; noteheadColor?: string } };
                  if (n.sourceNote?.isRest?.()) continue;
                  if (idx === noteIndex && n.sourceNote) {
                    n.sourceNote.noteheadColor = '#c00';
                    selectedNoteRef.current = note as { sourceNote?: { noteheadColor?: string } };
                    setHasSelection(true);
                    break outer;
                  }
                  idx++;
                }
              }
            }
          }
        }
      }
      osmdRef.current?.render();
    },
    [currentXml, getSelectedNoteIndex, loadXml]
  );

  const handleNatural = useCallback(() => applyAccidental(0, 'natural'), [applyAccidental]);
  const handleSharp = useCallback(() => applyAccidental(1, 'sharp'), [applyAccidental]);
  const handleFlat = useCallback(() => applyAccidental(-1, 'flat'), [applyAccidental]);
  const handleDoubleSharp = useCallback(() => applyAccidental(2, 'double-sharp'), [applyAccidental]);
  const handleDoubleFlat = useCallback(() => applyAccidental(-2, 'double-flat'), [applyAccidental]);
  const handleClearAccidental = useCallback(() => applyAccidental(0, ''), [applyAccidental]);

  const handleOsmdClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const osmd = osmdRef.current as IOsmdWithGraphic | null;
      const container = containerRef.current;
      if (!osmd || !container) return;
      const raw = osmd as unknown as {
        GraphicSheet?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
        graphic?: { MeasureList?: unknown[][]; measureList?: unknown[][] };
      };
      const graphic = raw.GraphicSheet ?? raw.graphic;
      const measureList = graphic?.MeasureList ?? graphic?.measureList;
      if (!Array.isArray(measureList)) return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      type NoteType = {
        sourceNote?: { noteheadColor?: string };
        getNoteheadSVGs?: () => HTMLElement[];
        parentVoiceEntry?: { notes?: unknown[] };
      };

      const elementToNotes = new Map<Element, NoteType[]>();
      for (const measureArray of measureList) {
        if (!Array.isArray(measureArray)) continue;
        for (const measure of measureArray) {
          const m = measure as { staffEntries?: { graphicalVoiceEntries?: { notes?: unknown[] }[] }[] };
          for (const staffEntry of m.staffEntries ?? []) {
            for (const voiceEntry of staffEntry.graphicalVoiceEntries ?? []) {
              for (const note of voiceEntry.notes ?? []) {
                const n = note as NoteType;
                const noteheads = n.getNoteheadSVGs?.();
                if (noteheads?.length) {
                  for (const el of noteheads) {
                    const list = elementToNotes.get(el) ?? [];
                    if (!list.includes(n)) list.push(n);
                    elementToNotes.set(el, list);
                  }
                }
              }
            }
          }
        }
      }

      let clickedNote: NoteType | null = null;
      const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
      for (const el of elementsAtPoint) {
        if (!elementToNotes.has(el)) continue;
        const notes = elementToNotes.get(el)!;
        if (notes.length === 1) {
          clickedNote = notes[0] ?? null;
          break;
        }
        const chordNotes = notes;
        const withRect = chordNotes
          .map((note) => {
            const nn = note as NoteType;
            const el = nn.getNoteheadSVGs?.()?.[0];
            const r = el?.getBoundingClientRect();
            return { note: nn, top: r?.top ?? 0, height: r?.height ?? 0, centerY: r ? r.top + r.height / 2 : 0 };
          })
          .filter((x) => x.height > 0);
        if (withRect.length === 0) {
          clickedNote = chordNotes[0] ?? null;
          break;
        }
        const sortedByTop = [...withRect].sort((a, b) => a.top - b.top);
        const chordTop = Math.min(...sortedByTop.map((x) => x.top));
        const chordBottom = Math.max(...sortedByTop.map((x) => x.top + x.height));
        const chordHeight = chordBottom - chordTop;
        const relY = clientY - chordTop;
        let index = Math.min(
          sortedByTop.length - 1,
          Math.max(0, Math.floor((relY / (chordHeight || 1)) * sortedByTop.length))
        );
        const firstTop = sortedByTop[0]?.top;
        const allSameTop = firstTop !== undefined && sortedByTop.every((x) => x.top === firstTop);
        if (allSameTop) index = sortedByTop.length - 1 - index;
        clickedNote = sortedByTop[index]?.note ?? chordNotes[0] ?? null;
        break;
      }

      if (!clickedNote) {
        let node: Node | null = e.target as Node;
        while (node && node !== document.body) {
          if (node instanceof Element && elementToNotes.has(node)) {
            const notes = elementToNotes.get(node)!;
            clickedNote = (notes.length === 1 ? notes[0] : notes[notes.length - 1] ?? notes[0]) ?? null;
            break;
          }
          node = node instanceof Element ? node.parentElement : node.parentNode;
        }
      }

      // Clear previous selection
      if (selectedNoteRef.current?.sourceNote && 'noteheadColor' in selectedNoteRef.current.sourceNote) {
        delete selectedNoteRef.current.sourceNote.noteheadColor;
      }
      selectedNoteRef.current = null;

      if (clickedNote?.sourceNote) {
        clickedNote.sourceNote.noteheadColor = '#c00';
        selectedNoteRef.current = clickedNote;
        setHasSelection(true);
      } else {
        setHasSelection(false);
      }

      osmd.render();
    },
    []
  );

  return (
    <div className="score-editor">
      <div className="score-editor__panel">
        <button type="button" className="score-editor__btn" onClick={handleOpenFile}>
          Open File
        </button>
        <button
          type="button"
          className="score-editor__btn"
          onClick={handleSaveFile}
          disabled={!currentXml}
        >
          Save File
        </button>
        <span className="score-editor__separator" aria-hidden />
        <span className="score-editor__accidentals" role="group" aria-label="Change accidental">
          <button
            type="button"
            className="score-editor__btn score-editor__btn--symbol"
            onClick={handleNatural}
            disabled={!hasSelection}
            title="Natural (♮)"
            aria-label="Set note to natural"
          >
            ♮
          </button>
          <button
            type="button"
            className="score-editor__btn score-editor__btn--symbol"
            onClick={handleSharp}
            disabled={!hasSelection}
            title="Sharp (♯)"
            aria-label="Set note to sharp"
          >
            ♯
          </button>
          <button
            type="button"
            className="score-editor__btn score-editor__btn--symbol"
            onClick={handleFlat}
            disabled={!hasSelection}
            title="Flat (♭)"
            aria-label="Set note to flat"
          >
            ♭
          </button>
          <button
            type="button"
            className="score-editor__btn score-editor__btn--symbol"
            onClick={handleDoubleSharp}
            disabled={!hasSelection}
            title="Double sharp (𝄪)"
            aria-label="Set note to double sharp"
          >
            𝄪
          </button>
          <button
            type="button"
            className="score-editor__btn score-editor__btn--symbol"
            onClick={handleDoubleFlat}
            disabled={!hasSelection}
            title="Double flat (𝄫)"
            aria-label="Set note to double flat"
          >
            𝄫
          </button>
          <button
            type="button"
            className="score-editor__btn score-editor__btn--symbol score-editor__btn--clear"
            onClick={handleClearAccidental}
            disabled={!hasSelection}
            title="Remove accidental (note follows key signature)"
            aria-label="Remove accidental so note follows key signature"
          >
            <span className="score-editor__clear-icon" aria-hidden>⌫</span>
          </button>
        </span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.musicxml,.mxl"
        onChange={handleFileChange}
        className="score-editor__file-input"
        aria-hidden
      />
      {error && <div className="score-editor__error" role="alert">{error}</div>}
      <div
        ref={containerRef}
        className="score-editor__osmd"
        onClick={handleOsmdClick}
        role="application"
        aria-label="Score: click a note to select it"
      />
    </div>
  );
}
