import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { APP_NAME } from '@/constants/app';
import { fullJson, rowsToCsv, type ExportRow } from '@/domain/export';

function createFile(name: string, contents: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create({ intermediates: true, overwrite: true });
  file.write(contents);
  return file;
}

export async function shareFullJson(tables: Record<string, ExportRow[]>): Promise<string> {
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const file = createFile(`oos-ops-${stamp}.json`, fullJson(tables, new Date().toISOString()));
  if (!(await Sharing.isAvailableAsync())) throw new Error('이 기기에서 파일 공유를 사용할 수 없습니다.');
  await Sharing.shareAsync(file.uri, { dialogTitle: `${APP_NAME} 전체 JSON 내보내기`, mimeType: 'application/json' });
  return file.uri;
}

export async function shareTableCsv(tableName: string, rows: ExportRow[]): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = createFile(`oos-ops-${tableName}-${stamp}.csv`, rowsToCsv(rows));
  if (!(await Sharing.isAvailableAsync())) throw new Error('이 기기에서 파일 공유를 사용할 수 없습니다.');
  await Sharing.shareAsync(file.uri, { dialogTitle: `${tableName} CSV 내보내기`, mimeType: 'text/csv' });
  return file.uri;
}
