import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
if (!serviceKey) throw new Error('DATA_GO_KR_SERVICE_KEY 환경변수가 필요합니다.');

const requestedYears = process.argv.slice(2).map(Number).filter(Number.isInteger);
const currentYear = new Date().getUTCFullYear();
const years = requestedYears.length > 0 ? requestedYears : [currentYear, currentYear + 1];
const holidays = [];

for (const year of years) {
  const url = new URL('https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo');
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('solYear', String(year));
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('_type', 'json');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${year}년 공휴일 응답 실패: HTTP ${response.status}`);
  const payload = await response.json();
  const resultCode = payload?.response?.header?.resultCode;
  if (resultCode !== '00') throw new Error(`${year}년 공휴일 API 오류: ${resultCode ?? '알 수 없음'}`);
  const rawItems = payload?.response?.body?.items?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  for (const item of items) {
    if (item.isHoliday !== 'Y') continue;
    const key = String(item.locdate);
    holidays.push({ date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`, name: String(item.dateName) });
  }
}

const output = {
  schemaVersion: 1,
  source: 'KASI Special Day Information API',
  generatedAt: new Date().toISOString(),
  supportedYears: [...new Set(years)].sort(),
  holidays: holidays.sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)),
};
const outputPath = fileURLToPath(new URL('../src/data/holidays.ko-KR.json', import.meta.url));
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`공휴일 ${output.holidays.length}건을 ${outputPath}에 저장했습니다.`);
