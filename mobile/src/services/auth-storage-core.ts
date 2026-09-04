export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface EnumerableKeyValueStorage extends AsyncKeyValueStorage {
  getAllKeys(): Promise<string[]>;
}

type AuthKeyPredicate = (key: string) => boolean;

export function supabaseAuthStorageKeyFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const projectReference = url.hostname.split('.')[0];
    return projectReference ? `sb-${projectReference}-auth-token` : null;
  } catch {
    return null;
  }
}

export function isSupabaseAuthStorageKey(storageKey: string, candidate: string): boolean {
  if (candidate === storageKey) return true;
  if (candidate === `${storageKey}-user`) return true;
  if (candidate === `${storageKey}-code-verifier`) return true;
  if (candidate === `${storageKey}-flows-code-verifier`) return true;
  return candidate.startsWith(`${storageKey}-flow-`) && candidate.endsWith('-code-verifier');
}

/**
 * Keeps Supabase sessions in encrypted native storage and removes matching
 * plaintext values left by the former expo-sqlite localStorage adapter.
 */
export function createMigratingAuthStorage(
  secureStorage: AsyncKeyValueStorage,
  legacyStorage: EnumerableKeyValueStorage,
  isAuthKey: AuthKeyPredicate,
): AsyncKeyValueStorage {
  const operationTails = new Map<string, Promise<unknown>>();
  let migrationPromise: Promise<void> | null = null;

  async function migrateLegacyValues(): Promise<void> {
    const keys = (await legacyStorage.getAllKeys()).filter(isAuthKey);
    for (const key of keys) {
      const secureValue = await secureStorage.getItem(key);
      if (secureValue === null) {
        const legacyValue = await legacyStorage.getItem(key);
        if (legacyValue !== null) await secureStorage.setItem(key, legacyValue);
      }
      await legacyStorage.removeItem(key);
    }
  }

  async function ensureMigrated(): Promise<void> {
    if (!migrationPromise) {
      migrationPromise = migrateLegacyValues().catch((error: unknown) => {
        migrationPromise = null;
        throw error;
      });
    }
    await migrationPromise;
  }

  function runForKey<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = operationTails.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    operationTails.set(key, current);
    return current.finally(() => {
      if (operationTails.get(key) === current) operationTails.delete(key);
    });
  }

  return {
    async getItem(key) {
      await ensureMigrated();
      return runForKey(key, async () => {
        const secureValue = await secureStorage.getItem(key);
        await legacyStorage.removeItem(key);
        return secureValue;
      });
    },

    async setItem(key, value) {
      await ensureMigrated();
      await runForKey(key, async () => {
        await secureStorage.setItem(key, value);
        await legacyStorage.removeItem(key);
      });
    },

    async removeItem(key) {
      await ensureMigrated();
      await runForKey(key, async () => {
        await legacyStorage.removeItem(key);
        await secureStorage.removeItem(key);
      });
    },
  };
}
