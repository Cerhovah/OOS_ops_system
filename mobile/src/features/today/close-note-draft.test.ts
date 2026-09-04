import { describe, expect, it } from 'vitest';

import {
  createCloseNoteDraft,
  editCloseNoteDraft,
  finishCloseNoteSave,
  hydrateCloseNoteDraft,
  isCloseNoteDraftReady,
} from './close-note-draft';

describe('close note draft', () => {
  const stored = { date: '2026-09-04', sourceKey: 'closure-1:first', value: 'stored note' };

  it('hydrates an existing note after a cold-start snapshot arrives', () => {
    const initial = createCloseNoteDraft(stored.date);
    expect(isCloseNoteDraftReady(initial, stored.date, stored.sourceKey)).toBe(false);

    const hydrated = hydrateCloseNoteDraft(initial, stored);
    expect(hydrated).toEqual({ ...stored, dirty: false, hydrated: true });
    expect(isCloseNoteDraftReady(hydrated, stored.date, stored.sourceKey)).toBe(true);
  });

  it('preserves an edit made before hydration while adopting the loaded source', () => {
    const edited = editCloseNoteDraft(createCloseNoteDraft(stored.date), 'local edit');
    const hydrated = hydrateCloseNoteDraft(edited, stored);

    expect(hydrated).toMatchObject({
      date: stored.date,
      sourceKey: stored.sourceKey,
      value: 'local edit',
      dirty: true,
      hydrated: true,
    });
  });

  it('does not clear an edit or another day while a save is in flight', () => {
    const submitted = editCloseNoteDraft(hydrateCloseNoteDraft(createCloseNoteDraft(stored.date), stored), 'submitted');
    const editedAgain = editCloseNoteDraft(submitted, 'new edit');
    const anotherDay = hydrateCloseNoteDraft(submitted, {
      date: '2026-09-05',
      sourceKey: 'none:2026-09-05',
      value: '',
    });

    expect(finishCloseNoteSave(editedAgain, submitted.date, submitted.value)).toBe(editedAgain);
    expect(finishCloseNoteSave(anotherDay, submitted.date, submitted.value)).toBe(anotherDay);
    expect(finishCloseNoteSave(submitted, submitted.date, submitted.value).dirty).toBe(false);
  });
});
