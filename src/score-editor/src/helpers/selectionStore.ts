import { useEffect, useState } from 'react';

import { getSelectedNoteLocator } from './noteSelection';
import type { GraphicNote, MeasureList } from '../models/osmd';
import type { NoteLocator } from '../models/musicXml';

type State = {
  measureList: MeasureList | null;
  selectedNote: GraphicNote | null;
  pendingLocator: NoteLocator | null;
};

const state: State = {
  measureList: null,
  selectedNote: null,
  pendingLocator: null,
};

const listeners = new Set<() => void>();

/**
 * Notifies all subscribers about store changes.
 */
function emit() {
  for (const l of listeners) l();
}

/**
 * Stores the OSMD measure list graph used for hit-testing and locator mapping.
 */
export function selectionStoreSetMeasureList(measureList: MeasureList | null) {
  state.measureList = measureList;
  emit();
}

/**
 * Stores the currently selected graphic note.
 */
export function selectionStoreSetSelectedNote(note: GraphicNote | null) {
  state.selectedNote = note;
  emit();
}

/**
 * Clears the current selection.
 */
export function selectionStoreClearSelection() {
  state.selectedNote = null;
  emit();
}

/**
 * Stores a locator that should be re-highlighted after rerender/load.
 */
export function selectionStoreSetPendingLocator(locator: NoteLocator | null) {
  state.pendingLocator = locator;
  emit();
}

/**
 * Returns the pending locator without clearing it.
 */
export function selectionStorePeekPendingLocator(): NoteLocator | null {
  return state.pendingLocator;
}

/**
 * Clears the pending locator.
 */
export function selectionStoreClearPendingLocator() {
  state.pendingLocator = null;
  emit();
}

/**
 * Builds a snapshot for React subscribers (selection + derived locator).
 */
function getSnapshot() {
  const hasSelection = !!state.selectedNote?.sourceNote;
  const locator =
    state.measureList && state.selectedNote?.sourceNote
      ? getSelectedNoteLocator(state.measureList, state.selectedNote.sourceNote)
      : null;
  return {
    hasSelection,
    locator,
    selectedNote: state.selectedNote,
  };
}

/**
 * React hook to subscribe to selection store changes.
 */
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

