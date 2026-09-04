import { describe, expect, it, vi } from 'vitest';

import { publishLocalMutation, subscribeToLocalMutations } from './local-mutation-signal';

describe('local mutation signal', () => {
  it('notifies active subscribers and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToLocalMutations(listener);
    publishLocalMutation();
    unsubscribe();
    publishLocalMutation();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
