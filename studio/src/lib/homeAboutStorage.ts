/**
 * 獨立「關於我們」頁（/about）後台內容，API 離線時寫入 localStorage。
 * site_content 鍵名仍為 home-about（與後端一致）。
 */

export interface HomeAboutContent {
  title: string;
  content: string;
}

const STORAGE_KEY = 'the_yard_home_about_content';

function getStored(): HomeAboutContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeAboutContent;
    if (parsed && typeof parsed.title === 'string' && typeof parsed.content === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function setStored(data: HomeAboutContent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save home about content to localStorage', e);
  }
}

export function getHomeAboutContent(): HomeAboutContent | null {
  return getStored();
}

export function saveHomeAboutContent(data: HomeAboutContent): void {
  setStored({ title: data.title.trim(), content: data.content.trim() });
}
