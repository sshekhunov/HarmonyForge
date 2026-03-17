import { useEffect, useState } from 'react';

import { getSelectedNoteLocator, type GraphicNote, type MeasureList, type SelectedNoteLocator } from './noteSelection';

type State = {
  measureList: MeasureList | null;
  selectedNote: GraphicNote | null;
  pendingLocator: SelectedNoteLocator | null;
};

const state: State = {
  measureList: null,
  selectedNote: null,
  pendingLocator: null,
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

export function selectionStoreSetPendingLocator(locator: SelectedNoteLocator | null) {
  state.pendingLocator = locator;
  emit();
}

export function selectionStorePeekPendingLocator(): SelectedNoteLocator | null {
  return state.pendingLocator;
}

export function selectionStoreClearPendingLocator() {
  state.pendingLocator = null;
  emit();
}

function getSnapshot() {
  const hasSelection = !!state.selectedNote?.sourceNote;
  const locator =
    state.measureList && state.selectedNote?.sourceNote
      ? getSelectedNoteLocator(state.measureList, state.selectedNote.sourceNote)
      : null;
  return {
    hasSelection,
    locator,
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

