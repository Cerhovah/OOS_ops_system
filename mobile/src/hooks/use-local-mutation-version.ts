import { useSyncExternalStore } from 'react';

import {
  getLocalMutationVersion,
  subscribeToLocalMutations,
} from '@/services/local-mutation-signal';

export function useLocalMutationVersion(): number {
  return useSyncExternalStore(
    subscribeToLocalMutations,
    getLocalMutationVersion,
    getLocalMutationVersion,
  );
}
