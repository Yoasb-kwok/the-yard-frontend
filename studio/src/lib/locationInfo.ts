/**
 * 分店地點：名稱、地址、地圖連結（學生／家長端顯示用）
 */
export type LocationKey = 'sanpokong' | 'causewaybay' | 'fotan' | 'sheungshui';

export interface LocationInfo {
  /** 分店名稱，e.g. 新蒲崗分店 */
  name: string;
  /** 完整地址 */
  address: string;
  /** Google Maps 連結，方便家長打開地圖 */
  mapsUrl: string;
}

const LOCATIONS: Record<LocationKey, LocationInfo> = {
  sanpokong: {
    name: '新蒲崗分店',
    address: '九龍新蒲崗大有街 34 號新科技廣場',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=新蒲崗大有街34號',
  },
  causewaybay: {
    name: '銅鑼灣分店',
    address: '香港銅鑼灣軒尼詩道 500 號',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=銅鑼灣軒尼詩道500號',
  },
  fotan: {
    name: '火炭分店',
    address: '新界沙田火炭坳背灣街 26 號',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=火炭坳背灣街26號',
  },
  sheungshui: {
    name: '上水分店',
    address: '新界上水新康街 68 號',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=上水新康街68號',
  },
};

export function getLocationInfo(loc: LocationKey | string | null | undefined): LocationInfo | null {
  if (!loc || !(loc in LOCATIONS)) return null;
  return LOCATIONS[loc as LocationKey];
}

export function getLocationName(loc: LocationKey | string | null | undefined): string {
  const info = getLocationInfo(loc);
  return info?.name ?? String(loc ?? '');
}

/** Calendar / schedule block colors — aligned with public calendar & admin classes. */
export interface LocationColors {
  primary: string;
  dark: string;
  light: string;
  lighter: string;
}

const LOCATION_COLORS: Record<LocationKey, LocationColors> = {
  sanpokong: { primary: '#10b981', dark: '#059669', light: '#34d399', lighter: '#d1fae5' },
  causewaybay: { primary: '#a67c52', dark: '#8b6f47', light: '#c49b6a', lighter: '#f0e6d2' },
  fotan: { primary: '#f97316', dark: '#ea580c', light: '#fb923c', lighter: '#ffedd5' },
  sheungshui: { primary: '#3b82f6', dark: '#2563eb', light: '#60a5fa', lighter: '#dbeafe' },
};

export function getLocationColors(loc: LocationKey | string | null | undefined): LocationColors {
  if (loc && loc in LOCATION_COLORS) return LOCATION_COLORS[loc as LocationKey];
  return LOCATION_COLORS.sanpokong;
}

export function getLocationCalendarColor(loc: LocationKey | string | null | undefined): string {
  return getLocationColors(loc).primary;
}
