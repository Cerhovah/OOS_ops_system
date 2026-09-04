export interface CloseNoteDraft {
  date: string;
  sourceKey: string;
  value: string;
  dirty: boolean;
  hydrated: boolean;
}

interface CloseNoteSource {
  date: string;
  sourceKey: string;
  value: string;
}

export function createCloseNoteDraft(date: string): CloseNoteDraft {
  return { date, sourceKey: '', value: '', dirty: false, hydrated: false };
}

export function hydrateCloseNoteDraft(
  current: CloseNoteDraft,
  source: CloseNoteSource,
): CloseNoteDraft {
  if (current.date === source.date && current.dirty) {
    return { ...current, sourceKey: source.sourceKey, hydrated: true };
  }
  if (current.date === source.date && current.sourceKey === source.sourceKey && current.hydrated) {
    return current;
  }
  return { ...source, dirty: false, hydrated: true };
}

export function editCloseNoteDraft(current: CloseNoteDraft, value: string): CloseNoteDraft {
  return { ...current, value, dirty: true };
}

export function isCloseNoteDraftReady(
  current: CloseNoteDraft,
  date: string,
  sourceKey: string,
): boolean {
  return current.hydrated && current.date === date && current.sourceKey === sourceKey;
}

export function finishCloseNoteSave(
  current: CloseNoteDraft,
  savedDate: string,
  savedValue: string,
): CloseNoteDraft {
  if (current.date !== savedDate || current.value !== savedValue) return current;
  return current.dirty ? { ...current, dirty: false } : current;
}
