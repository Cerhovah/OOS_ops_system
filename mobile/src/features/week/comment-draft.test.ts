import { describe, expect, it } from 'vitest';

import {
  beginWeeklyCommentDraft,
  canSaveWeeklyCommentDraft,
  editWeeklyCommentDraft,
  failWeeklyCommentDraft,
  finishWeeklyCommentSave,
  markWeeklyCommentLoading,
  markWeeklyCommentSaved,
  resolveWeeklyCommentDraft,
} from './comment-draft';

describe('weekly comment draft', () => {
  it('ignores a stale response from another week', () => {
    const first = beginWeeklyCommentDraft(null, '2026-08-31');
    const second = beginWeeklyCommentDraft(first, '2026-09-07');
    expect(resolveWeeklyCommentDraft(second, '2026-08-31', 'old response')).toBe(second);
  });

  it('does not overwrite a local edit with a delayed refresh', () => {
    const draft = editWeeklyCommentDraft(beginWeeklyCommentDraft(null, '2026-08-31'), 'editing');
    expect(resolveWeeklyCommentDraft(draft, '2026-08-31', 'server value')).toEqual({
      ...draft,
      loadStatus: 'ready',
      loadError: null,
    });
  });

  it('hydrates a clean draft and marks a saved edit clean', () => {
    const draft = beginWeeklyCommentDraft(null, '2026-08-31');
    const loaded = resolveWeeklyCommentDraft(draft, '2026-08-31', 'stored');
    expect(loaded).toEqual({
      weekStart: '2026-08-31',
      value: 'stored',
      dirty: false,
      loadStatus: 'ready',
      loadError: null,
    });
    expect(markWeeklyCommentSaved(editWeeklyCommentDraft(loaded, 'changed')).dirty).toBe(false);
  });

  it('blocks saving after a load failure and preserves edits through a retry', () => {
    const editing = editWeeklyCommentDraft(beginWeeklyCommentDraft(null, '2026-08-31'), 'local edit');
    const failed = failWeeklyCommentDraft(editing, '2026-08-31', 'load failed');

    expect(failed).toMatchObject({ value: 'local edit', dirty: true, loadStatus: 'error', loadError: 'load failed' });
    expect(canSaveWeeklyCommentDraft(failed, '2026-08-31')).toBe(false);

    const retrying = markWeeklyCommentLoading(failed, '2026-08-31');
    const resolved = resolveWeeklyCommentDraft(retrying, '2026-08-31', 'stored value');
    expect(resolved).toMatchObject({ value: 'local edit', dirty: true, loadStatus: 'ready', loadError: null });
    expect(canSaveWeeklyCommentDraft(resolved, '2026-08-31')).toBe(true);
  });

  it('ignores a stale load failure from another week', () => {
    const current = beginWeeklyCommentDraft(null, '2026-09-07');
    expect(failWeeklyCommentDraft(current, '2026-08-31', 'old failure')).toBe(current);
  });

  it('does not clear an edit or another week that changed while a save was in flight', () => {
    const submitted = editWeeklyCommentDraft(beginWeeklyCommentDraft(null, '2026-08-31'), 'submitted');
    const editedAgain = editWeeklyCommentDraft(submitted, 'new edit');
    const anotherWeek = beginWeeklyCommentDraft(submitted, '2026-09-07');

    expect(finishWeeklyCommentSave(editedAgain, submitted.weekStart, submitted.value)).toBe(editedAgain);
    expect(finishWeeklyCommentSave(anotherWeek, submitted.weekStart, submitted.value)).toBe(anotherWeek);
    expect(finishWeeklyCommentSave(submitted, submitted.weekStart, submitted.value)?.dirty).toBe(false);
  });
});
