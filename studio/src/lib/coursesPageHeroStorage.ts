/**
 * Admin-editable 課程介紹頁頂部區塊（晉升流程）：圖片 URL + 三語標題與描述。
 * 前台 CoursesPage 讀取；後台 AdminCourseIntroPage 編輯。
 */

export interface CoursesPageHero {
  image_url?: string;
  title_zh_tw?: string;
  title_zh_cn?: string;
  title_en?: string;
  desc_zh_tw?: string;
  desc_zh_cn?: string;
  desc_en?: string;
  note_zh_tw?: string;
  note_zh_cn?: string;
  note_en?: string;
}

const STORAGE_KEY = 'the_yard_courses_page_hero';

function getStored(): CoursesPageHero {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function setStored(data: CoursesPageHero) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save courses page hero to localStorage', e);
  }
}

export function getCoursesPageHero(): CoursesPageHero {
  return getStored();
}

export function setCoursesPageHero(hero: CoursesPageHero): void {
  setStored(hero);
}

function getForLocale(zhTw?: string, zhCn?: string, en?: string, lang: string): string {
  const l = lang === 'zh-CN' ? 'zh-CN' : lang === 'en' || lang.startsWith('en') ? 'en' : 'zh-TW';
  const v = l === 'zh-TW' ? zhTw : l === 'zh-CN' ? zhCn : en;
  return (v && String(v).trim()) || '';
}

export function getHeroTitleForLocale(hero: CoursesPageHero | undefined, defaultTitle: string, lang: string): string {
  if (!hero) return defaultTitle;
  const n = getForLocale(hero.title_zh_tw, hero.title_zh_cn, hero.title_en, lang);
  return n || defaultTitle;
}

export function getHeroDescForLocale(hero: CoursesPageHero | undefined, defaultDesc: string, lang: string): string {
  if (!hero) return defaultDesc;
  const n = getForLocale(hero.desc_zh_tw, hero.desc_zh_cn, hero.desc_en, lang);
  return n || defaultDesc;
}

export function getHeroNoteForLocale(hero: CoursesPageHero | undefined, defaultNote: string, lang: string): string {
  if (!hero) return defaultNote;
  const n = getForLocale(hero.note_zh_tw, hero.note_zh_cn, hero.note_en, lang);
  return n || defaultNote;
}
