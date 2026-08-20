import { describe, expect, it } from 'vitest';

import { fullJson, rowsToCsv } from './export';

describe('data export', () => {
  it('writes a UTF-8 BOM and escapes CSV cells', () => {
    expect(rowsToCsv([{ id: '1', note: '쉼표, 줄\n"인용"', deleted_at: null }])).toBe(
      '\uFEFFid,note,deleted_at\r\n1,"쉼표, 줄\n""인용""",',
    );
  });

  it('returns a BOM for an empty table', () => {
    expect(rowsToCsv([])).toBe('\uFEFF');
  });

  it('keeps soft-deleted rows and every plan version in full JSON', () => {
    const value = fullJson(
      {
        entries: [{ id: 'deleted', deleted_at: '2026-08-20T00:00:00Z' }],
        weekly_plans: [
          { id: 'v1', version: 1 },
          { id: 'v2', version: 2 },
        ],
      },
      '2026-08-20T00:00:00Z',
    );
    const parsed = JSON.parse(value) as { tables: Record<string, ExportRow[]> };
    expect(parsed.tables.entries[0].deleted_at).not.toBeNull();
    expect(parsed.tables.weekly_plans).toHaveLength(2);
  });
});

interface ExportRow {
  [key: string]: string | number | null;
}
