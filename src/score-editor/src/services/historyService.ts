import { useEffect, useState } from 'react';
import { diff_match_patch } from 'diff-match-patch';

type PatchPair = {
  forwardText: string;
  backwardText: string;
};

type State = {
  undo: PatchPair[];
  redo: PatchPair[];
  isApplying: boolean;
};

const dmp = new diff_match_patch();

const state: State = {
  undo: [],
  redo: [],
  isApplying: false,
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

function makePatchText(fromText: string, toText: string): string {
  const patches = dmp.patch_make(fromText, toText);
  return dmp.patch_toText(patches);
}

function applyPatchText(text: string, patchText: string): string | null {
  const patches = dmp.patch_fromText(patchText);
  const [result, applied] = dmp.patch_apply(patches, text) as [string, boolean[]];
  return applied.every(Boolean) ? result : null;
}

export function historyReset() {
  state.undo = [];
  state.redo = [];
  state.isApplying = false;
  emit();
}

export function historyIsApplying(): boolean {
  return state.isApplying;
}

export function historyMarkApplying() {
  state.isApplying = true;
}

export function historyClearApplying() {
  state.isApplying = false;
}

export function historyRecord(prevXml: string, nextXml: string) {
  if (prevXml === nextXml) return;
  const forwardText = makePatchText(prevXml, nextXml);
  const backwardText = makePatchText(nextXml, prevXml);
  state.undo.push({ forwardText, backwardText });
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

export function historyUndo(currentXml: string): string | null {
  const pair = state.undo.pop();
  if (!pair) return null;
  const prev = applyPatchText(currentXml, pair.backwardText);
  if (prev == null) {
    // If patch fails, put it back.
    state.undo.push(pair);
    return null;
  }
  state.redo.push(pair);
  emit();
  return prev;
}

export function historyRedo(currentXml: string): string | null {
  const pair = state.redo.pop();
  if (!pair) return null;
  const next = applyPatchText(currentXml, pair.forwardText);
  if (next == null) {
    state.redo.push(pair);
    return null;
  }
  state.undo.push(pair);
  emit();
  return next;
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

