import { describe, expect, it } from 'vitest';

import {
  sqliteBoolean,
  sqliteNullableNumber,
  sqliteNullableText,
  sqliteNumber,
  sqliteText,
  type SqlRow,
} from './sqlite-row';

describe('strict SQLite row conversion', () => {
  const row: SqlRow = { text_value: 'value', number_value: 3, null_value: null, false_value: 0, true_value: 1 };

  it('reads values only through their declared SQLite scalar type', () => {
    expect(sqliteText(row, 'text_value')).toBe('value');
    expect(sqliteNumber(row, 'number_value')).toBe(3);
    expect(sqliteNullableText(row, 'null_value')).toBeNull();
    expect(sqliteNullableNumber(row, 'null_value')).toBeNull();
    expect(sqliteBoolean(row, 'false_value')).toBe(false);
    expect(sqliteBoolean(row, 'true_value')).toBe(true);
  });

  it('does not turn missing or corrupt values into "undefined" or NaN', () => {
    expect(() => sqliteText(row, 'missing')).toThrow('필요한 열');
    expect(() => sqliteText(row, 'number_value')).toThrow('TEXT');
    expect(() => sqliteNumber(row, 'text_value')).toThrow('숫자');
    expect(() => sqliteBoolean({ invalid: 2 }, 'invalid')).toThrow('boolean');
  });
});
