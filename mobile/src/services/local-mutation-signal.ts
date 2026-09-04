type LocalMutationListener = () => void;

const listeners = new Set<LocalMutationListener>();

export function publishLocalMutation(): void {
  for (const listener of listeners) listener();
}

export function subscribeToLocalMutations(listener: LocalMutationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
