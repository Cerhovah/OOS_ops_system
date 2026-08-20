export type ExportRow = Readonly<Record<string, string | number | null>>;

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const rendered = String(value);
  if (!/[",\r\n]/.test(rendered)) return rendered;
  return `"${rendered.replaceAll('"', '""')}"`;
}

export function rowsToCsv(rows: readonly ExportRow[]): string {
  if (rows.length === 0) return '\uFEFF';
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const body = rows.map((row) => headers.map((header) => csvCell(row[header] ?? null)).join(','));
  return `\uFEFF${[headers.join(','), ...body].join('\r\n')}`;
}

export function fullJson(tables: Readonly<Record<string, readonly ExportRow[]>>, exportedAt: string): string {
  return JSON.stringify({ schemaVersion: 1, exportedAt, tables }, null, 2);
}
