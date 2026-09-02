import * as Sharing from 'expo-sharing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { shareFullJson, shareTableCsv } from './export-service';

const fileState = vi.hoisted(() => ({
  available: true,
  files: new Map<string, string>(),
}));

vi.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: class MockFile {
    readonly uri: string;

    constructor(_directory: string, name: string) {
      this.uri = `cache://${name}`;
    }

    get exists(): boolean {
      return fileState.files.has(this.uri);
    }

    create(): void {
      fileState.files.set(this.uri, '');
    }

    delete(): void {
      fileState.files.delete(this.uri);
    }

    write(contents: string): void {
      fileState.files.set(this.uri, contents);
    }
  },
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(async () => fileState.available),
  shareAsync: vi.fn(async () => undefined),
}));

describe('native export sharing', () => {
  beforeEach(() => {
    fileState.available = true;
    fileState.files.clear();
    vi.clearAllMocks();
  });

  it('writes the full JSON payload and opens the Android share sheet', async () => {
    const uri = await shareFullJson({
      accounts: [{ id: 'a', deleted_at: null }],
      weekly_plans: [{ id: 'v1', version: 1 }, { id: 'v2', version: 2 }],
    });

    expect(uri).toMatch(/^cache:\/\/oos-ops-.*\.json$/);
    expect(JSON.parse(fileState.files.get(uri)!)).toMatchObject({
      schemaVersion: 1,
      tables: {
        accounts: [{ id: 'a', deleted_at: null }],
        weekly_plans: [{ id: 'v1', version: 1 }, { id: 'v2', version: 2 }],
      },
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, {
      dialogTitle: 'OOS Ops 전체 JSON 내보내기',
      mimeType: 'application/json',
    });
  });

  it('writes UTF-8 BOM CSV with escaped data and shares the named table', async () => {
    const uri = await shareTableCsv('entries', [{ id: 'e1', note: '쉼표,줄\n바꿈' }]);
    expect(fileState.files.get(uri)).toBe('\uFEFFid,note\r\ne1,"쉼표,줄\n바꿈"');
    expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, {
      dialogTitle: 'entries CSV 내보내기',
      mimeType: 'text/csv',
    });
  });

  it('reports devices without a file sharing target', async () => {
    fileState.available = false;
    await expect(shareTableCsv('entries', [])).rejects.toThrow('이 기기에서 파일 공유를 사용할 수 없습니다.');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
