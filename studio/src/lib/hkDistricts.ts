/**
 * HK 18 district keys for dropdowns. Use with t(`districts.${key}`).
 */
export const HK_DISTRICT_KEYS = [
  'centralWestern',
  'eastern',
  'southern',
  'wanChai',
  'kowloonCity',
  'kwunTong',
  'shamShuiPo',
  'wongTaiSin',
  'yauTsimMong',
  'islands',
  'kwaiTsing',
  'north',
  'saiKung',
  'shaTin',
  'taiPo',
  'tsuenWan',
  'tuenMun',
  'yuenLong',
] as const;

export type HKDistrictKey = (typeof HK_DISTRICT_KEYS)[number];
