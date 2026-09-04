type LocalMutationListener = () => void;

const listeners = new Set<LocalMutationListener>();
let mutationVersion = 0;

export function publishLocalMutation(): void {
  mutationVersion += 1;
  for (const listener of listeners) listener();
}

export function getLocalMutationVersion(): number {
  return mutationVersion;
}

export function subscribeToLocalMutations(listener: LocalMutationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
