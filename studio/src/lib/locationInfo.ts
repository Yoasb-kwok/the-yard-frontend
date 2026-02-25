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
