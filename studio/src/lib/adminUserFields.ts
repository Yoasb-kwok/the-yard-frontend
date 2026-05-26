/**
 * Admin 用戶管理：後端欄位正規化（性別、出生日期、居住地區等）。
 */
import { HK_DISTRICT_KEYS, type HKDistrictKey } from './hkDistricts';

function toOptStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/** 後端可能用 gender / sex / 字串 male,female,男女 */
export function normalizeSex(v: unknown): boolean | null {
  if (v == null || v === '') return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'male', 'm', '男', 'man', 'boy'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'female', 'f', '女', 'woman', 'girl'].includes(s)) return false;
  return null;
}

/** ISO、YYYY-MM-DD、DD/MM/YYYY */
export function normalizeDateOfBirth(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** 常見中文區名 → dropdown key（與 seed／舊資料相容） */
const DISTRICT_ZH_TO_KEY: Record<string, HKDistrictKey> = {
  中西區: 'centralWestern',
  東區: 'eastern',
  南區: 'southern',
  灣仔: 'wanChai',
  灣仔區: 'wanChai',
  銅鑼灣: 'wanChai',
  九龍城: 'kowloonCity',
  九龍城區: 'kowloonCity',
  觀塘: 'kwunTong',
  觀塘區: 'kwunTong',
  九龍灣: 'kwunTong',
  深水埗: 'shamShuiPo',
  深水埗區: 'shamShuiPo',
  黃大仙: 'wongTaiSin',
  黃大仙區: 'wongTaiSin',
  油尖旺: 'yauTsimMong',
  油尖旺區: 'yauTsimMong',
  離島: 'islands',
  離島區: 'islands',
  葵青: 'kwaiTsing',
  葵青區: 'kwaiTsing',
  北區: 'north',
  西貢: 'saiKung',
  西貢區: 'saiKung',
  沙田: 'shaTin',
  沙田區: 'shaTin',
  大埔: 'taiPo',
  大埔區: 'taiPo',
  荃灣: 'tsuenWan',
  荃灣區: 'tsuenWan',
  屯門: 'tuenMun',
  屯門區: 'tuenMun',
  元朗: 'yuenLong',
  元朗區: 'yuenLong',
};

export function normalizeResidentialDistrict(v: unknown): string | null {
  const s = toOptStr(v);
  if (!s) return null;
  if ((HK_DISTRICT_KEYS as readonly string[]).includes(s)) return s;
  const fromZh = DISTRICT_ZH_TO_KEY[s] ?? DISTRICT_ZH_TO_KEY[s.replace(/區$/, '')];
  if (fromZh) return fromZh;
  return s;
}

export function formatResidentialDistrictLabel(
  value: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!value?.trim()) return '–';
  const key = normalizeResidentialDistrict(value);
  if (!key) return '–';
  const tr = t(`districts.${key}`);
  return tr !== `districts.${key}` ? tr : key;
}

/** 從 API 列讀取 profiles 陣列（相容多種欄位名） */
export function readProfilesArray(user: Record<string, unknown>, rawProfiles?: unknown): unknown[] {
  if (Array.isArray(rawProfiles)) return rawProfiles;
  if (Array.isArray(user.profiles)) return user.profiles as unknown[];
  if (Array.isArray(user.student_profiles)) return user.student_profiles as unknown[];
  if (Array.isArray(user.studentProfiles)) return user.studentProfiles as unknown[];
  return [];
}
