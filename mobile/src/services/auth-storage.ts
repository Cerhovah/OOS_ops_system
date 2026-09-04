import * as SecureStore from 'expo-secure-store';
import { Storage as SQLiteKeyValueStorage } from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

import {
  createMigratingAuthStorage,
  isSupabaseAuthStorageKey,
  type AsyncKeyValueStorage,
} from '@/services/auth-storage-core';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'com.oosops.app.auth',
  requireAuthentication: false,
};

const secureStoreAvailable = SecureStore.isAvailableAsync();

const nativeSecureStorage: AsyncKeyValueStorage = {
  async getItem(key) {
    if (!(await secureStoreAvailable)) throw new Error('이 기기에서 보안 세션 저장소를 사용할 수 없습니다.');
    return SecureStore.getItemAsync(key, secureStoreOptions);
  },
  async setItem(key, value) {
    if (!(await secureStoreAvailable)) throw new Error('이 기기에서 보안 세션 저장소를 사용할 수 없습니다.');
    await SecureStore.setItemAsync(key, value, secureStoreOptions);
  },
  async removeItem(key) {
    if (!(await secureStoreAvailable)) throw new Error('이 기기에서 보안 세션 저장소를 사용할 수 없습니다.');
    await SecureStore.deleteItemAsync(key, secureStoreOptions);
  },
};

const browserStorage: AsyncKeyValueStorage = {
  getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key) => globalThis.localStorage?.removeItem(key),
};

export function createAuthStorage(storageKey: string): AsyncKeyValueStorage {
  if (Platform.OS === 'web') return browserStorage;
  return createMigratingAuthStorage(
    nativeSecureStorage,
    SQLiteKeyValueStorage,
    (key) => isSupabaseAuthStorageKey(storageKey, key),
  );
}
