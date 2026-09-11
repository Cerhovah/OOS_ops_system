import holidayData from '@/data/holidays.ko-KR.json';

export interface Holiday {
  date: string;
  name: string;
}

interface HolidayAsset {
  schemaVersion: number;
  source: string;
  generatedAt: string | null;
  supportedYears: number[];
  holidays: Holiday[];
}

const asset: HolidayAsset = holidayData;

export const HOLIDAY_ASSET_INFO = {
  schemaVersion: asset.schemaVersion,
  source: asset.source,
  generatedAt: asset.generatedAt,
  supportedYears: asset.supportedYears,
} as const;

const holidaysByDate = new Map(asset.holidays.map((holiday) => [holiday.date, holiday.name]));

export function holidayName(date: string): string | null {
  return holidaysByDate.get(date) ?? null;
}

export function holidaysForMonth(month: string): Holiday[] {
  return asset.holidays.filter((holiday) => holiday.date.startsWith(`${month}-`));
}
