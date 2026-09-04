export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;

function column(row: SqlRow, key: string): SqlValue {
  if (!Object.hasOwn(row, key)) {
    throw new Error(`SQLite 행에 필요한 열이 없습니다: ${key}`);
  }
  return row[key];
}

export function sqliteText(row: SqlRow, key: string): string {
  const value = column(row, key);
  if (typeof value !== 'string') {
    throw new Error(`SQLite TEXT 열의 값이 올바르지 않습니다: ${key}`);
  }
  return value;
}

export function sqliteNullableText(row: SqlRow, key: string): string | null {
  const value = column(row, key);
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`SQLite TEXT 열의 값이 올바르지 않습니다: ${key}`);
  }
  return value;
}

export function sqliteNumber(row: SqlRow, key: string): number {
  const value = column(row, key);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`SQLite 숫자 열의 값이 올바르지 않습니다: ${key}`);
  }
  return value;
}

export function sqliteNullableNumber(row: SqlRow, key: string): number | null {
  const value = column(row, key);
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`SQLite 숫자 열의 값이 올바르지 않습니다: ${key}`);
  }
  return value;
}

export function sqliteBoolean(row: SqlRow, key: string): boolean {
  const value = sqliteNumber(row, key);
  if (value !== 0 && value !== 1) {
    throw new Error(`SQLite boolean 열의 값이 올바르지 않습니다: ${key}`);
  }
  return value === 1;
}
