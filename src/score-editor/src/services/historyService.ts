import { useEffect, useState } from 'react';
import type { MusicXmlDocument } from '../models/musicXmlDocument';

type State = {
  undo: MusicXmlDocument[];
  redo: MusicXmlDocument[];
  isApplying: boolean;
};

const state: State = {
  undo: [],
  redo: [],
  isApplying: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Clears all undo/redo history.
 */
export function historyReset() {
  state.undo = [];
  state.redo = [];
  state.isApplying = false;
  emit();
}

/**
 * Indicates that the next document change is caused by undo/redo.
 */
export function historyIsApplying(): boolean {
  return state.isApplying;
}

/**
 * Marks that the next document change is caused by undo/redo.
 */
export function historyMarkApplying() {
  state.isApplying = true;
}

/**
 * Clears the undo/redo applying marker.
 */
export function historyClearApplying() {
  state.isApplying = false;
}

/**
 * Records a document change.
 *
 * The editor stores full snapshots so the MusicXML model is only built from XML
 * when a file is opened (not during normal undo/redo).
 */
export function historyRecord(prevDoc: MusicXmlDocument, nextDoc: MusicXmlDocument) {
  if (prevDoc === nextDoc) return;
  state.undo.push(structuredClone(prevDoc));
  state.redo = [];
  state.isApplying = false;
  emit();
}

export function historyCanUndo(): boolean {
  return state.undo.length > 0;
}

export function historyCanRedo(): boolean {
  return state.redo.length > 0;
}

/**
 * Returns the previous document snapshot and moves the current snapshot to redo.
 */
export function historyUndo(currentDoc: MusicXmlDocument): MusicXmlDocument | null {
  const prev = state.undo.pop();
  if (!prev) return null;
  state.redo.push(structuredClone(currentDoc));
  emit();
  return structuredClone(prev);
}

/**
 * Returns the next document snapshot and moves the current snapshot to undo.
 */
export function historyRedo(currentDoc: MusicXmlDocument): MusicXmlDocument | null {
  const next = state.redo.pop();
  if (!next) return null;
  state.undo.push(structuredClone(currentDoc));
  emit();
  return structuredClone(next);
}

function getSnapshot() {
  return {
    canUndo: historyCanUndo(),
    canRedo: historyCanRedo(),
  };
}

export function useHistorySnapshot() {
  const [snap, setSnap] = useState(getSnapshot);
  useEffect(() => {
    const listener = () => setSnap(getSnapshot());
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snap;
}

