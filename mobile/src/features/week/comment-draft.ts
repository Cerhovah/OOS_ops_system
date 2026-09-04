export interface WeeklyCommentDraft {
  weekStart: string;
  value: string;
  dirty: boolean;
  loadStatus: 'loading' | 'ready' | 'error';
  loadError: string | null;
}

export function beginWeeklyCommentDraft(
  current: WeeklyCommentDraft | null,
  weekStart: string,
): WeeklyCommentDraft {
  if (current?.weekStart === weekStart) return current;
  return { weekStart, value: '', dirty: false, loadStatus: 'loading', loadError: null };
}

export function markWeeklyCommentLoading(
  current: WeeklyCommentDraft | null,
  weekStart: string,
): WeeklyCommentDraft {
  const draft = beginWeeklyCommentDraft(current, weekStart);
  if (draft.loadStatus === 'loading' && draft.loadError === null) return draft;
  return { ...draft, loadStatus: 'loading', loadError: null };
}

export function resolveWeeklyCommentDraft(
  current: WeeklyCommentDraft,
  weekStart: string,
  value: string,
): WeeklyCommentDraft {
  if (current.weekStart !== weekStart) return current;
  if (current.dirty) return { ...current, loadStatus: 'ready', loadError: null };
  return { weekStart, value, dirty: false, loadStatus: 'ready', loadError: null };
}

export function failWeeklyCommentDraft(
  current: WeeklyCommentDraft,
  weekStart: string,
  message: string,
): WeeklyCommentDraft {
  if (current.weekStart !== weekStart) return current;
  return { ...current, loadStatus: 'error', loadError: message };
}

export function editWeeklyCommentDraft(
  current: WeeklyCommentDraft,
  value: string,
): WeeklyCommentDraft {
  return { ...current, value, dirty: true };
}

export function markWeeklyCommentSaved(current: WeeklyCommentDraft): WeeklyCommentDraft {
  return { ...current, dirty: false, loadStatus: 'ready', loadError: null };
}

export function canSaveWeeklyCommentDraft(
  current: WeeklyCommentDraft | null,
  weekStart: string,
): boolean {
  return current?.weekStart === weekStart && current.loadStatus === 'ready';
}

export function finishWeeklyCommentSave(
  current: WeeklyCommentDraft | null,
  savedWeekStart: string,
  savedValue: string,
): WeeklyCommentDraft | null {
  if (current?.weekStart !== savedWeekStart || current.value !== savedValue) return current;
  return markWeeklyCommentSaved(current);
}
