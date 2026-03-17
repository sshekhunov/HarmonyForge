import { useEffect, useState } from 'react';

import { getSelectedNoteIndex, type GraphicNote, type MeasureList } from './noteSelection';

type State = {
  measureList: MeasureList | null;
  selectedNote: GraphicNote | null;
  pendingHighlightIndex: number | null;
};

const state: State = {
  measureList: null,
  selectedNote: null,
  pendingHighlightIndex: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function selectionStoreSetMeasureList(measureList: MeasureList | null) {
  state.measureList = measureList;
  emit();
}

export function selectionStoreSetSelectedNote(note: GraphicNote | null) {
  state.selectedNote = note;
  emit();
}

export function selectionStoreClearSelection() {
  state.selectedNote = null;
  emit();
}

export function selectionStoreSetPendingHighlightIndex(noteIndex: number | null) {
  state.pendingHighlightIndex = noteIndex;
  emit();
}

export function selectionStoreConsumePendingHighlightIndex(): number | null {
  const v = state.pendingHighlightIndex;
  state.pendingHighlightIndex = null;
  return v;
}

function getSnapshot() {
  const hasSelection = !!state.selectedNote?.sourceNote;
  const selectedNoteIndex =
    state.measureList && state.selectedNote?.sourceNote
      ? getSelectedNoteIndex(state.measureList, state.selectedNote.sourceNote)
      : null;
  return {
    hasSelection,
    selectedNoteIndex,
  };
}

export function useSelectionSnapshot() {
  const [snap, setSnap] = useState(getSnapshot);
  useEffect(() => {
    const listener = () => setSnap(getSnapshot());
    listeners.add(listener);
    // ensure we don't miss a synchronous update between render and effect
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snap;
}

