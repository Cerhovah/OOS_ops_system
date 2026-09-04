import { describe, expect, it, vi } from 'vitest';

import {
  getLocalMutationVersion,
  publishLocalMutation,
  subscribeToLocalMutations,
} from './local-mutation-signal';

describe('local mutation signal', () => {
  it('notifies active subscribers and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLocalMutations(listener);
    publishLocalMutation();
    unsubscribe();
    publishLocalMutation();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('advances a stable external-store version for every published mutation', () => {
    const before = getLocalMutationVersion();

    publishLocalMutation();
    publishLocalMutation();

    expect(getLocalMutationVersion()).toBe(before + 2);
  });
});
